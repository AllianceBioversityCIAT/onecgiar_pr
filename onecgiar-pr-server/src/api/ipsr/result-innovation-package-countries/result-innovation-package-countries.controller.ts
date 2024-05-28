import { Controller, UseInterceptors } from '@nestjs/common';
import { ResultInnovationPackageCountriesService } from './result-innovation-package-countries.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('result-innovation-package-countries')
@UseInterceptors(ResponseInterceptor)
export class ResultInnovationPackageCountriesController {
  constructor(
    private readonly resultInnovationPackageCountriesService: ResultInnovationPackageCountriesService,
  ) {}
}
