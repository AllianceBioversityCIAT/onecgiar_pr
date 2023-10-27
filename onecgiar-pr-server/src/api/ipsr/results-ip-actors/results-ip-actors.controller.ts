import { Controller } from '@nestjs/common';
import { ResultsIpActorsService } from './results-ip-actors.service';

@Controller('results-ip-actors')
export class ResultsIpActorsController {
  constructor(
    private readonly resultsIpActorsService: ResultsIpActorsService,
  ) {}
}
