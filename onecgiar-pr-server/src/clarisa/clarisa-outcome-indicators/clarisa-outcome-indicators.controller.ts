import { Controller } from '@nestjs/common';
import { ClarisaOutcomeIndicatorsService } from './clarisa-outcome-indicators.service';

@Controller('clarisa-outcome-indicators')
export class ClarisaOutcomeIndicatorsController {
  constructor(
    private readonly clarisaOutcomeIndicatorsService: ClarisaOutcomeIndicatorsService,
  ) {}
}
