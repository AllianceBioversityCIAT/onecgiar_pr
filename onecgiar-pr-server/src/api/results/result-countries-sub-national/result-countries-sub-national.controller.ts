import { Controller } from '@nestjs/common';
import { ResultCountriesSubNationalService } from './result-countries-sub-national.service';

@Controller('result-countries-sub-national')
export class ResultCountriesSubNationalController {
  constructor(
    private readonly resultCountriesSubNationalService: ResultCountriesSubNationalService,
  ) {}
}
