import { Controller } from '@nestjs/common';
import { ResultsImpactAreaTargetService } from './results-impact-area-target.service';

@Controller()
export class ResultsImpactAreaTargetController {
  constructor(
    private readonly resultsImpactAreaTargetService: ResultsImpactAreaTargetService,
  ) {}
}
