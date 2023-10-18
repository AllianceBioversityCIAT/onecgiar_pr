import { Controller } from '@nestjs/common';
import { ResultInnovationPackageCountriesService } from './result-innovation-package-countries.service';

@Controller('result-innovation-package-countries')
export class ResultInnovationPackageCountriesController {
  constructor(
    private readonly resultInnovationPackageCountriesService: ResultInnovationPackageCountriesService,
  ) {}
}
