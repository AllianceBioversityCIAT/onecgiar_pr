import { Controller } from '@nestjs/common';
import { ClarisaCountriesRegionsService } from './clarisa-countries-regions.service';

@Controller('clarisa-countries-regions')
export class ClarisaCountriesRegionsController {
  constructor(
    private readonly clarisaCountriesRegionsService: ClarisaCountriesRegionsService,
  ) {}
}
