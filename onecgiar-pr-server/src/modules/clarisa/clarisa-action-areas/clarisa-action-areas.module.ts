import { Module } from '@nestjs/common';
import { ClarisaActionAreasService } from './clarisa-action-areas.service';
import { ClarisaActionAreasController } from './clarisa-action-areas.controller';

@Module({
  controllers: [ClarisaActionAreasController],
  providers: [ClarisaActionAreasService]
})
export class ClarisaActionAreasModule {}
