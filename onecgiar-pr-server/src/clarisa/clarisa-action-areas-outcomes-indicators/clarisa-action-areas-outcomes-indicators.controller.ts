import { Controller } from '@nestjs/common';
import { ClarisaActionAreasOutcomesIndicatorsService } from './clarisa-action-areas-outcomes-indicators.service';

@Controller()
export class ClarisaActionAreasOutcomesIndicatorsController {
  constructor(
    private readonly clarisaActionAreasOutcomesIndicatorsService: ClarisaActionAreasOutcomesIndicatorsService,
  ) {}
}
