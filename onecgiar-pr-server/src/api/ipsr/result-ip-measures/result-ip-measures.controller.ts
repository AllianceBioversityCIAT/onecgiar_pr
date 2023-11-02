import { Controller } from '@nestjs/common';
import { ResultIpMeasuresService } from './result-ip-measures.service';

@Controller('result-ip-measures')
export class ResultIpMeasuresController {
  constructor(
    private readonly resultIpMeasuresService: ResultIpMeasuresService,
  ) {}
}
