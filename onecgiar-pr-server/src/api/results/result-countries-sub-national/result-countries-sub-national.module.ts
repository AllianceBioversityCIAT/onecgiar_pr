import { Module } from '@nestjs/common';
import { ResultCountriesSubNationalService } from './result-countries-sub-national.service';
import { ResultCountriesSubNationalController } from './result-countries-sub-national.controller';
import { ResultCountriesSubNationalRepository } from './result-countries-sub-national.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultCountriesSubNationalController],
  providers: [ResultCountriesSubNationalService, ResultCountriesSubNationalRepository, HandlersError]
})
export class ResultCountriesSubNationalModule { }
