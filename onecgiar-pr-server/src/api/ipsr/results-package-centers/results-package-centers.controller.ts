import { Controller } from '@nestjs/common';
import { ResultsPackageCentersService } from './results-package-centers.service';

@Controller('results-package-centers')
export class ResultsPackageCentersController {
  constructor(
    private readonly resultsPackageCentersService: ResultsPackageCentersService,
  ) {}
}
