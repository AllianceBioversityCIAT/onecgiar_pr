import { Module } from '@nestjs/common';
import { ResultCountriesSubNationalRepository } from './repositories/result-countries-sub-national.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultCountrySubnationalController } from './result-countries-sub-national.controller';
import { ResultCountrySubnationalService } from './result-countries-sub-national.service';
import { ResultCountrySubnationalRepository } from './repositories/result-country-subnational.repository';

@Module({
  controllers: [ResultCountrySubnationalController],
  providers: [
    ResultCountrySubnationalService,
    ResultCountriesSubNationalRepository,
    ResultCountrySubnationalRepository,
    ReturnResponse,
    HandlersError,
  ],
  exports: [ResultCountrySubnationalRepository],
})
export class ResultCountriesSubNationalModule {}
