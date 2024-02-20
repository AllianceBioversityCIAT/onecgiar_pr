import { Controller, UseInterceptors } from '@nestjs/common';
import { ResultInnovationPackageRegionsService } from './result-innovation-package-regions.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('result-innovation-package-regions')
@UseInterceptors(ResponseInterceptor)
export class ResultInnovationPackageRegionsController {
  constructor(
    private readonly resultInnovationPackageRegionsService: ResultInnovationPackageRegionsService,
  ) {}
}
