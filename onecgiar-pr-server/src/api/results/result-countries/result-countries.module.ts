import { Module } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';
import { ResultCountriesController } from './result-countries.controller';
import { ResultCountryRepository } from './result-countries.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';

@Module({
  controllers: [ResultCountriesController],
  providers: [ResultCountriesService, ResultCountryRepository, HandlersError, ResultRepository],
  exports: [
    ResultCountryRepository,
    ResultCountriesService
  ]
})
export class ResultCountriesModule {}
