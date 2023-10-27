import { Controller } from '@nestjs/common';
import { ResultsComplementaryInnovationsService } from './results-complementary-innovations.service';

@Controller('results-complementary-innovations')
export class ResultsComplementaryInnovationsController {
  constructor(
    private readonly resultsComplementaryInnovationsService: ResultsComplementaryInnovationsService,
  ) {}
}
