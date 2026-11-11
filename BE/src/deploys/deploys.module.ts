import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { K8sModule } from '../k8s/k8s.module.js'
import { ReposModule } from '../repos/repos.module.js'
import { DeployConditionService } from './deploy-condition.service.js'
import { DeploysController } from './deploys.controller.js'
import { DeploysService } from './deploys.service.js'
import { DeploysStore } from './deploys.store.js'
import { SecretsService } from './secrets.service.js'

@Module({
  imports: [ConfigModule, ReposModule, K8sModule],
  controllers: [DeploysController],
  providers: [DeploysService, DeploysStore, DeployConditionService, SecretsService],
  exports: [DeployConditionService],
})
export class DeploysModule {}
