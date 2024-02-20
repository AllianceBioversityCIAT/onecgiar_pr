import { Controller, UseInterceptors } from '@nestjs/common';
import { ResultsPackageCentersService } from './results-package-centers.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('results-package-centers')
@UseInterceptors(ResponseInterceptor)
export class ResultsPackageCentersController {
  constructor(
    private readonly resultsPackageCentersService: ResultsPackageCentersService,
  ) {}
}
