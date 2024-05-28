import { Controller, UseInterceptors } from '@nestjs/common';
import { ResultsComplementaryInnovationsService } from './results-complementary-innovations.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('results-complementary-innovations')
@UseInterceptors(ResponseInterceptor)
export class ResultsComplementaryInnovationsController {
  constructor(
    private readonly resultsComplementaryInnovationsService: ResultsComplementaryInnovationsService,
  ) {}
}
