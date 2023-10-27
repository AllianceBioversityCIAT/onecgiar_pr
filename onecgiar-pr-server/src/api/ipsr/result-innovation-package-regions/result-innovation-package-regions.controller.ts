import { Controller } from '@nestjs/common';
import { ResultInnovationPackageRegionsService } from './result-innovation-package-regions.service';

@Controller('result-innovation-package-regions')
export class ResultInnovationPackageRegionsController {
  constructor(
    private readonly resultInnovationPackageRegionsService: ResultInnovationPackageRegionsService,
  ) {}
}
