import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import http from 'node:http'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { FakeK8s } from '../../test/fake-k8s.js'
import type { Env } from '../config/env.js'
import { K8sClient } from './k8s.client.js'
import { SecretService } from './secret.service.js'

const TOKEN = 'k8s-secret-token'
const unavailable = { response: { code: 'CLUSTER_UNAVAILABLE' }, status: 503 }
const COLLECTION = '/api/v1/namespaces/proj-my-app/secrets'
const OBJECT = `${COLLECTION}/be-secrets`

let fake: FakeK8s
let service: SecretService
beforeAll(async () => {
  fake = new FakeK8s(http.createServer())
  const url = await fake.listen()
  service = new SecretService(new K8sClient(new ConfigService<Env, true>({ K8S_API_URL: url, K8S_TOKEN: TOKEN, K8S_CA_CERT: 'unused' })))
})
afterEach(() => {
  vi.restoreAllMocks()
  fake.seen = []
  fake.answers.clear()
})
afterAll(() => fake.close())

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')

describe('SecretService.write', () => {
  it('creates the Secret <service>-secrets in proj-<slug>: Opaque, the keys as env names, the values base64', async () => {
    await service.write('my-app', 'be', { DATABASE_URL: 'postgres://u:p@h/db', JWT_SECRET: '비밀 값\n' })
    expect(fake.seen).toHaveLength(1)
    expect(fake.seen[0]).toMatchObject({ method: 'POST', path: COLLECTION, auth: `Bearer ${TOKEN}` })
    expect(fake.seen[0].body).toEqual({
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: 'be-secrets', namespace: 'proj-my-app' },
      type: 'Opaque',
      data: { DATABASE_URL: b64('postgres://u:p@h/db'), JWT_SECRET: b64('비밀 값\n') },
    })
  })

  it('replaces the whole Secret when it exists already (409 AlreadyExists): the same body, to the object, no resourceVersion', async () => {
    fake.answers.set(COLLECTION, { status: 409, body: { reason: 'AlreadyExists' } })
    await service.write('my-app', 'be', { A: '1' })
    expect(fake.seen.map((s) => `${s.method} ${s.path}`)).toEqual([`POST ${COLLECTION}`, `PUT ${OBJECT}`])
    expect(fake.seen[1].body).toEqual(fake.seen[0].body)
    expect(JSON.stringify(fake.seen[1].body)).not.toContain('resourceVersion')
  })

  it('never sends a plain value', async () => {
    await service.write('my-app', 'be', { A: 'plain-value-123' })
    expect(JSON.stringify(fake.seen)).not.toContain('plain-value-123')
  })

  it.each([
    ['the create is refused', COLLECTION, { status: 403, body: { reason: 'Forbidden' } }],
    ['the create is rejected by an admission rule', COLLECTION, { status: 422, body: { reason: 'Invalid' } }],
    ['the token is refused', COLLECTION, { status: 401, body: { reason: 'Unauthorized' } }],
    ['a 409 that is not AlreadyExists', COLLECTION, { status: 409, body: { reason: 'Conflict' } }],
  ] as const)('answers 503 when %s, and does not try to replace', async (_, path, answer) => {
    fake.answers.set(path, answer)
    await expect(service.write('my-app', 'be', { A: '1' })).rejects.toMatchObject(unavailable)
    expect(fake.seen).toHaveLength(1)
  })

  it.each([
    ['refused', { status: 403, body: { reason: 'Forbidden' } }],
    ['not found', { status: 404, body: { reason: 'NotFound' } }],
    ['server error', { status: 500 }],
  ] as const)('answers 503 when the replace is %s', async (_, answer) => {
    fake.answers.set(COLLECTION, { status: 409, body: { reason: 'AlreadyExists' } })
    fake.answers.set(OBJECT, answer)
    await expect(service.write('my-app', 'be', { A: '1' })).rejects.toMatchObject(unavailable)
  })

  it('keeps the values, the token and the answer text out of the logs when it fails', async () => {
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    fake.answers.set(COLLECTION, { status: 403, body: { reason: 'Forbidden', message: 'answer-text' } })
    await service.write('my-app', 'be', { A: 'plain-value-123' }).catch(() => undefined)
    expect(logged).toHaveBeenCalledWith(`POST ${COLLECTION} answered 403 Forbidden`)
    expect(JSON.stringify(logged.mock.calls)).not.toMatch(/plain-value|answer-text|k8s-secret-token/)
  })

  it.each([
    ['slug', ['My-App', 'be', { A: '1' }]],
    ['slug with a slash', ['a/b', 'be', { A: '1' }]],
    ['service', ['my-app', 'Be', { A: '1' }]],
    ['service with a slash', ['my-app', 'be/../x', { A: '1' }]],
    ['key', ['my-app', 'be', { 'a b': '1' }]],
    ['key __proto__', ['my-app', 'be', JSON.parse('{"__proto__":"1"}') as Record<string, string>]],
  ] as const)('refuses an invalid %s before calling the cluster, with no value in the message', async (_, [slug, name, values]) => {
    const err = (await service.write(slug, name, values as Record<string, string>).catch((e: unknown) => e)) as Error
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toMatch(/^Not a valid/)
    expect(fake.seen).toEqual([])
  })
})
