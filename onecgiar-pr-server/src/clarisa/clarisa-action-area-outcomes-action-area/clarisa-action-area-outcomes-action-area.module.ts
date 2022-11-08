import { Module } from '@nestjs/common';
import { ClarisaActionAreaOutcomesActionAreaService } from './clarisa-action-area-outcomes-action-area.service';
import { ClarisaActionAreaOutcomesActionAreaController } from './clarisa-action-area-outcomes-action-area.controller';

@Module({
  controllers: [ClarisaActionAreaOutcomesActionAreaController],
  providers: [ClarisaActionAreaOutcomesActionAreaService]
})
export class ClarisaActionAreaOutcomesActionAreaModule {}
