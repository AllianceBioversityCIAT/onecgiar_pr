import { Controller, UseInterceptors } from '@nestjs/common';
import { ResultsComplementaryInnovationsFunctionsService } from './results-complementary-innovations-functions.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('results-complementary-innovations-functions')
@UseInterceptors(ResponseInterceptor)
export class ResultsComplementaryInnovationsFunctionsController {
  constructor(
    private readonly resultsComplementaryInnovationsFunctionsService: ResultsComplementaryInnovationsFunctionsService,
  ) {}
}
