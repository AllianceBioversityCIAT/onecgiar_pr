import { Module } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';
import { ResultCountriesController } from './result-countries.controller';
import { ResultCountryRepository } from './result-countries.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import { VersionsService } from '../versions/versions.service';
import { ResultCountrySubnationalRepository } from '../result-countries-sub-national/repositories/result-country-subnational.repository';

@Module({
  controllers: [ResultCountriesController],
  providers: [
    ResultCountriesService,
    ResultCountryRepository,
    HandlersError,
    ResultRepository,
    VersionsService,
    VersionRepository,
    ReturnResponse,
    ResultCountrySubnationalRepository,
  ],
  exports: [ResultCountryRepository, ResultCountriesService],
})
export class ResultCountriesModule {}
