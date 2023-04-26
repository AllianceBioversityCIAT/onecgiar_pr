import { Module } from '@nestjs/common';
import { ResultCountriesSubNationalService } from './result-countries-sub-national.service';
import { ResultCountriesSubNationalController } from './result-countries-sub-national.controller';

@Module({
  controllers: [ResultCountriesSubNationalController],
  providers: [ResultCountriesSubNationalService]
})
export class ResultCountriesSubNationalModule {}
