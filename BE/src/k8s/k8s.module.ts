import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { K8sClient } from './k8s.client.js'
import { SecretService } from './secret.service.js'
import { SpaceService } from './space.service.js'

@Module({
  imports: [ConfigModule],
  providers: [K8sClient, SpaceService, SecretService],
  exports: [SpaceService, SecretService],
})
export class K8sModule {}
