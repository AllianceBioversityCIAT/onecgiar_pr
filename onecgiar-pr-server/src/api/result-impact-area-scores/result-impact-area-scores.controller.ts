import { Controller } from '@nestjs/common';
import { ResultImpactAreaScoresService } from './result-impact-area-scores.service';

@Controller('result-impact-area-scores')
export class ResultImpactAreaScoresController {
  constructor(
    private readonly resultImpactAreaScoresService: ResultImpactAreaScoresService,
  ) {}
}
