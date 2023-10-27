import { Controller } from '@nestjs/common';
import { ResultsComplementaryInnovationsFunctionsService } from './results-complementary-innovations-functions.service';

@Controller('results-complementary-innovations-functions')
export class ResultsComplementaryInnovationsFunctionsController {
  constructor(
    private readonly resultsComplementaryInnovationsFunctionsService: ResultsComplementaryInnovationsFunctionsService,
  ) {}
}
