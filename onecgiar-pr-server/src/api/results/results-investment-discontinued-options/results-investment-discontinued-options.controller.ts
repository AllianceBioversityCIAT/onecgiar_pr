import { Controller } from '@nestjs/common';
import { ResultsInvestmentDiscontinuedOptionsService } from './results-investment-discontinued-options.service';

@Controller()
export class ResultsInvestmentDiscontinuedOptionsController {
  constructor(
    private readonly resultsInvestmentDiscontinuedOptionsService: ResultsInvestmentDiscontinuedOptionsService,
  ) {}
}
