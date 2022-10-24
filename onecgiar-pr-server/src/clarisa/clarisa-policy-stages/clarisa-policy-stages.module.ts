import { Module } from '@nestjs/common';
import { ClarisaPolicyStagesService } from './clarisa-policy-stages.service';
import { ClarisaPolicyStagesController } from './clarisa-policy-stages.controller';

@Module({
  controllers: [ClarisaPolicyStagesController],
  providers: [ClarisaPolicyStagesService]
})
export class ClarisaPolicyStagesModule {}
