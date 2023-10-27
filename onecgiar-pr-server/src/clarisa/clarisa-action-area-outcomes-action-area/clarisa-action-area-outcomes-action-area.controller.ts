import { Controller } from '@nestjs/common';
import { ClarisaActionAreaOutcomesActionAreaService } from './clarisa-action-area-outcomes-action-area.service';

@Controller('clarisa-action-area-outcomes-action-area')
export class ClarisaActionAreaOutcomesActionAreaController {
  constructor(
    private readonly clarisaActionAreaOutcomesActionAreaService: ClarisaActionAreaOutcomesActionAreaService,
  ) {}
}
