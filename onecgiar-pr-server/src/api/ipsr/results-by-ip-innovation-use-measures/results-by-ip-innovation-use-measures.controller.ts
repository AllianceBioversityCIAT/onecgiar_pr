import { Controller, UseInterceptors } from '@nestjs/common';
import { ResultsByIpInnovationUseMeasuresService } from './results-by-ip-innovation-use-measures.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('results-by-ip-innovation-use-measures')
@UseInterceptors(ResponseInterceptor)
export class ResultsByIpInnovationUseMeasuresController {
  constructor(
    private readonly resultsByIpInnovationUseMeasuresService: ResultsByIpInnovationUseMeasuresService,
  ) {}
}
