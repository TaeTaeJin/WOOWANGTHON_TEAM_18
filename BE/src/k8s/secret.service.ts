import { Injectable } from '@nestjs/common'
import { isEnvName, SERVICE_NAME, SLUG } from '../deploys/deploy-input.js'
import { K8sClient } from './k8s.client.js'

/**
 * 서비스의 비밀값을 리더의 Secret `<서비스>-secrets`(공간 `proj-<slug>`)로 쓴다. 설계는 docs/design/api.md "비밀값".
 * 서버 계정은 Secret을 읽거나 patch할 수 없어서(docs/design/cluster.md §8) 만들고, 이미 있으면 통째로 바꾼다.
 * 값은 이 클래스 밖으로 나가지 않는다: 로그 · 오류에는 이름만 담고, 리더의 응답 본문은 읽지 않고 버린다.
 */
@Injectable()
export class SecretService {
  constructor(private readonly k8s: K8sClient) {}

  async write(slug: string, service: string, values: Record<string, string>): Promise<void> {
    // 요청 경로와 Secret 이름에 들어가는 값이다. 검증을 통과하지 않은 값은 부른 쪽의 버그다(메시지에는 값을 싣지 않는다).
    if (!SLUG.test(slug)) throw new Error('Not a valid slug')
    if (!SERVICE_NAME.test(service)) throw new Error('Not a valid service name')
    if (!Object.keys(values).every(isEnvName)) throw new Error('Not a valid secret key')

    const namespace = `proj-${slug}`
    const name = `${service}-secrets`
    const body = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name, namespace },
      // 검사 규칙은 Opaque만 통과시킨다(서비스 계정 토큰 타입으로 토큰을 찍어내지 못하게).
      type: 'Opaque',
      data: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Buffer.from(value, 'utf8').toString('base64')])),
    }
    const collection = `/api/v1/namespaces/${namespace}/secrets`
    if ((await this.k8s.create(collection, body)) === 'exists') await this.k8s.replace(`${collection}/${name}`, body)
  }
}
