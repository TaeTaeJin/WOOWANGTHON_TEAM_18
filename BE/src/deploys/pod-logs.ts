import { Injectable, Logger } from '@nestjs/common'
import { ClusterError } from '../k8s/cluster-error.js'
import { ClusterReader } from '../k8s/cluster-reader.js'
import type { Stage } from './deploy-run.js'

export interface TicketLogs {
  from: string
  to: string
  lines: string[]
}

const MAX_LINES = 200
const WINDOW_SECONDS = 600

/**
 * 문제 티켓의 `logs`(docs/design/AIagent.md §5). 실행기에는 Pod 로그 권한이 없어서 apply · verify 실패의 로그는 비어서 오므로,
 * 여기서 서버 계정으로 읽어 채운다. 파이프라인이 로그를 보냈으면 그것이 우선이고, 읽기가 실패해도 티켓은 빈 로그로 간다.
 * 외부로 나가기 전의 비밀값 가림은 티켓을 만드는 쪽이 한다.
 */
@Injectable()
export class PodLogs {
  private readonly logger = new Logger(PodLogs.name)

  constructor(private readonly cluster: ClusterReader) {}

  async forTicket(
    run: { slug: string; target_slot: string },
    stage: Stage,
    service: string | null,
    given: TicketLogs | null,
    now: Date,
  ): Promise<TicketLogs> {
    if (given && given.lines.length > 0) return given
    const fallback = given ?? { from: now.toISOString(), to: now.toISOString(), lines: [] }
    if ((stage !== 'apply' && stage !== 'verify') || service === null) return fallback
    try {
      const pods = (await this.cluster.pods(run.slug)).filter((p) => p.labels.app === service && p.labels.slot === run.target_slot)
      // 준비되지 않은 Pod가 실패한 쪽이다.
      const pod = pods.find((p) => !p.ready) ?? pods[0]
      if (!pod) return fallback
      // 다시 시작한 Pod의 현재 컨테이너는 막 떴으므로 죽은 직전 컨테이너를 읽는다.
      const text = await this.cluster.logs(run.slug, pod.name, { container: service, tailLines: MAX_LINES, sinceSeconds: WINDOW_SECONDS, previous: pod.restarts > 0 })
      const body = text.replace(/\n$/, '')
      if (body === '') return fallback
      const lines = body.split('\n')
      return { from: new Date(now.getTime() - WINDOW_SECONDS * 1000).toISOString(), to: now.toISOString(), lines: lines.slice(-MAX_LINES) }
    } catch (err) {
      // 로그가 없어도 티켓은 간다. 원인은 클러스터 쪽 상태만 남긴다(메시지에 값이 있을 수 있다).
      this.logger.warn(`Pod logs of ${run.slug}/${service} not read: ${err instanceof ClusterError ? `${err.kind} ${err.apiStatus ?? ''}`.trim() : 'error'}`)
      return fallback
    }
  }
}
