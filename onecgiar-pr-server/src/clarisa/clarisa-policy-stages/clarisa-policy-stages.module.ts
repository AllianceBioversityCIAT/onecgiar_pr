import { Module } from '@nestjs/common';
import { ClarisaPolicyStagesService } from './clarisa-policy-stages.service';
import { ClarisaPolicyStagesController } from './clarisa-policy-stages.controller';
import { ClarisaPolicyStageRepository } from './clarisa-policy-stages.repository';

@Module({
  controllers: [ClarisaPolicyStagesController],
  providers: [
    ClarisaPolicyStagesService,
    ClarisaPolicyStageRepository
  ],
  exports: [
    ClarisaPolicyStageRepository 
  ]
})
export class ClarisaPolicyStagesModule {}
