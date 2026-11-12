import { Logger } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { ClusterError } from '../k8s/cluster-error.js'
import type { ClusterReader, PodInfo } from '../k8s/cluster-reader.js'
import { PodLogs } from './pod-logs.js'

const NOW = new Date('2026-11-12T03:00:00.000Z')
const RUN = { slug: 'my-app', target_slot: 'b' as const }

const pod = (over: Partial<PodInfo> = {}): PodInfo => ({
  name: 'be-b-1',
  labels: { app: 'be', slot: 'b' },
  phase: 'Running',
  node: 'w1',
  ready: false,
  restarts: 0,
  waiting: null,
  ...over,
})

function setup(pods: PodInfo[] | Error, text: string | Error = 'line 1\nline 2\n') {
  const reader = {
    pods: vi.fn(() => (pods instanceof Error ? Promise.reject(pods) : Promise.resolve(pods))),
    logs: vi.fn(() => (text instanceof Error ? Promise.reject(text) : Promise.resolve(text))),
  }
  return { reader, podLogs: new PodLogs(reader as unknown as ClusterReader) }
}

const empty = { from: NOW.toISOString(), to: NOW.toISOString(), lines: [] }

describe('PodLogs.forTicket', () => {
  let warn: MockInstance<Logger['warn']>
  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => vi.restoreAllMocks())

  it.each(['apply', 'verify'] as const)('fills a %s failure with the last lines of the failed service\'s pod from the last 10 minutes', async (stage) => {
    const { reader, podLogs } = setup([pod()])
    const logs = await podLogs.forTicket(RUN, stage, 'be', null, NOW)
    expect(logs).toEqual({ from: '2026-11-12T02:50:00.000Z', to: NOW.toISOString(), lines: ['line 1', 'line 2'] })
    expect(reader.pods).toHaveBeenCalledWith('my-app')
    expect(reader.logs).toHaveBeenCalledWith('my-app', 'be-b-1', { container: 'be', tailLines: 200, sinceSeconds: 600, previous: false })
  })

  it('reads the previous container of a pod that restarted', async () => {
    const { reader, podLogs } = setup([pod({ restarts: 1 })])
    await podLogs.forTicket(RUN, 'apply', 'be', null, NOW)
    expect(reader.logs).toHaveBeenCalledWith('my-app', 'be-b-1', expect.objectContaining({ previous: true }))
  })

  it('looks only at the target slot\'s pods of that service, and prefers one that is not ready', async () => {
    const { reader, podLogs } = setup([
      pod({ name: 'be-a-1', labels: { app: 'be', slot: 'a' } }),
      pod({ name: 'fe-b-1', labels: { app: 'fe', slot: 'b' } }),
      pod({ name: 'be-b-bad' }),
      pod({ name: 'be-b-ok', ready: true }),
    ])
    await podLogs.forTicket(RUN, 'apply', 'be', null, NOW)
    expect(reader.logs).toHaveBeenCalledWith('my-app', 'be-b-bad', expect.anything())
  })

  it('reads the first pod when every pod is ready (a verify failure on a pod that is up)', async () => {
    const { reader, podLogs } = setup([pod({ name: 'be-b-first', ready: true }), pod({ name: 'be-b-second', ready: true })])
    await podLogs.forTicket(RUN, 'verify', 'be', null, NOW)
    expect(reader.logs).toHaveBeenCalledWith('my-app', 'be-b-first', expect.anything())
  })

  it('fills in logs the pipeline sent without any lines', async () => {
    const given = { from: '2026-11-12T02:00:00Z', to: '2026-11-12T02:10:00Z', lines: [] }
    const logs = await setup([pod()]).podLogs.forTicket(RUN, 'apply', 'be', given, NOW)
    expect(logs).toEqual({ from: '2026-11-12T02:50:00.000Z', to: NOW.toISOString(), lines: ['line 1', 'line 2'] })
  })

  it('reads nothing and logs no warning when the service has no pod in the target slot', async () => {
    const { reader, podLogs } = setup([pod({ labels: { app: 'be', slot: 'a' } })])
    expect(await podLogs.forTicket(RUN, 'apply', 'be', null, NOW)).toEqual(empty)
    expect(reader.logs).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps what the pipeline sent and does not touch the cluster', async () => {
    const given = { from: '2026-11-12T02:00:00Z', to: '2026-11-12T02:10:00Z', lines: ['from the pipeline'] }
    const { reader, podLogs } = setup([pod()])
    expect(await podLogs.forTicket(RUN, 'apply', 'be', given, NOW)).toBe(given)
    expect(reader.pods).not.toHaveBeenCalled()
    expect(reader.logs).not.toHaveBeenCalled()
  })

  it.each(['build', 'prepare', 'render'] as const)('does not read the cluster for a %s failure', async (stage) => {
    const { reader, podLogs } = setup([pod()])
    expect(await podLogs.forTicket(RUN, stage, 'be', null, NOW)).toEqual(empty)
    expect(reader.pods).not.toHaveBeenCalled()
  })

  it('does not read the cluster when the failure has no service', async () => {
    const { reader, podLogs } = setup([pod()])
    expect(await podLogs.forTicket(RUN, 'apply', null, null, NOW)).toEqual(empty)
    expect(reader.pods).not.toHaveBeenCalled()
  })

  it('keeps the (empty) logs the pipeline sent when the pod has nothing to read', async () => {
    const given = { from: '2026-11-12T02:00:00Z', to: '2026-11-12T02:10:00Z', lines: [] }
    expect(await setup([pod()], '').podLogs.forTicket(RUN, 'apply', 'be', given, NOW)).toBe(given)
    expect(await setup([]).podLogs.forTicket(RUN, 'apply', 'be', given, NOW)).toBe(given)
  })

  it.each([
    ['there is no pod', [] as PodInfo[], 'x'],
    ['the pod has no log', [pod()], ''],
    ['the pod log is only a newline', [pod()], '\n'],
  ])('gives empty logs when %s', async (_name, pods, text) => {
    expect(await setup(pods, text).podLogs.forTicket(RUN, 'apply', 'be', null, NOW)).toEqual(empty)
  })

  it.each([
    ['listing the pods fails', new ClusterError('unreachable'), 'x'],
    ['reading the log fails (a pod still waiting to start answers 400)', [pod()], new ClusterError('unexpected', 400)],
    ['the cluster is not configured', new ClusterError('unconfigured'), 'x'],
    ['something else throws', new Error('boom'), 'x'],
  ])('gives empty logs instead of throwing when %s', async (_name, pods, text) => {
    expect(await setup(pods, text).podLogs.forTicket(RUN, 'apply', 'be', null, NOW)).toEqual(empty)
  })

  it('notes only the kind of the failure in the log, not an error text that could hold a value', async () => {
    await setup(new Error('password=hunter2pass')).podLogs.forTicket(RUN, 'apply', 'be', null, NOW)
    await setup([pod()], new ClusterError('forbidden', 403)).podLogs.forTicket(RUN, 'apply', 'be', null, NOW)
    expect(warn.mock.calls.map(([m]) => String(m))).toEqual(['Pod logs of my-app/be not read: error', 'Pod logs of my-app/be not read: forbidden 403'])
  })

  it('keeps the last 200 lines and drops the final blank line', async () => {
    const text = `${Array.from({ length: 250 }, (_, i) => `l${i}`).join('\n')}\n`
    const { lines } = await setup([pod()], text).podLogs.forTicket(RUN, 'apply', 'be', null, NOW)
    expect(lines).toHaveLength(200)
    expect(lines[0]).toBe('l50')
    expect(lines.at(-1)).toBe('l249')
  })
})
