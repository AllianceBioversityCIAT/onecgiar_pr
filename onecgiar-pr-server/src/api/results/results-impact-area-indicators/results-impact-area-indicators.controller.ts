import { Controller } from '@nestjs/common';
import { ResultsImpactAreaIndicatorsService } from './results-impact-area-indicators.service';

@Controller()
export class ResultsImpactAreaIndicatorsController {
  constructor(
    private readonly resultsImpactAreaIndicatorsService: ResultsImpactAreaIndicatorsService,
  ) {}
}
