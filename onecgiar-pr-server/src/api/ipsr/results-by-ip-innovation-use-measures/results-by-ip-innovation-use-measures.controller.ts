import { Controller } from '@nestjs/common';
import { ResultsByIpInnovationUseMeasuresService } from './results-by-ip-innovation-use-measures.service';

@Controller('results-by-ip-innovation-use-measures')
export class ResultsByIpInnovationUseMeasuresController {
  constructor(
    private readonly resultsByIpInnovationUseMeasuresService: ResultsByIpInnovationUseMeasuresService,
  ) {}
}
