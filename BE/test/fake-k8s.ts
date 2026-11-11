import http from 'node:http'
import https from 'node:https'
import type { AddressInfo } from 'node:net'

// 가짜 쿠버네티스 API. 받은 요청을 적어 두고, 경로마다 정한 답을 준다(없으면 201).
export interface Seen {
  method: string
  path: string
  auth: string | undefined
  contentType: string | undefined
  body: unknown
}
export type Answer = { status: number; body?: unknown } | 'hangup'

export class FakeK8s {
  seen: Seen[] = []
  answers = new Map<string, Answer>()
  /** 경로만으로 가를 수 없을 때(같은 경로에 서로 다른 객체) 요청을 보고 답을 정한다. undefined면 `answers`를 따른다. */
  decide: ((seen: Seen) => Answer | undefined) | undefined
  constructor(readonly server: http.Server | https.Server) {
    server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', () => {
        const seen: Seen = {
          method: req.method ?? '',
          path: req.url ?? '',
          auth: req.headers.authorization,
          contentType: req.headers['content-type'],
          body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown,
        }
        this.seen.push(seen)
        const answer = this.decide?.(seen) ?? this.answers.get(req.url ?? '') ?? { status: 201 }
        if (answer === 'hangup') return void req.socket.destroy()
        res.writeHead(answer.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(answer.body ?? { kind: 'Status' }))
      })
    })
  }
  get paths() {
    return this.seen.map((s) => s.path)
  }
  async listen(): Promise<string> {
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', r))
    const { port } = this.server.address() as AddressInfo
    return `${this.server instanceof https.Server ? 'https' : 'http'}://127.0.0.1:${port}`
  }
  close() {
    return new Promise<void>((r) => this.server.close(() => r()))
  }
}
