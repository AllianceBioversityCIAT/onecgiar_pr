import { Controller } from '@nestjs/common';
import { ResultsPackageByInitiativesService } from './results-package-by-initiatives.service';

@Controller('results-package-by-initiatives')
export class ResultsPackageByInitiativesController {
  constructor(
    private readonly resultsPackageByInitiativesService: ResultsPackageByInitiativesService,
  ) {}
}
