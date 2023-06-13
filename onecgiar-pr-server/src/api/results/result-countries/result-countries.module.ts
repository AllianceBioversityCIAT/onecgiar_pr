import { Module } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';
import { ResultCountriesController } from './result-countries.controller';
import { ResultCountryRepository } from './result-countries.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { VersionRepository } from '../../versioning/version.repository';
import { VersionsService } from '../versions/versions.service';

@Module({
  controllers: [ResultCountriesController],
  providers: [
    ResultCountriesService,
    ResultCountryRepository,
    HandlersError,
    ResultRepository,
    VersionsService,
    VersionRepository,
  ],
  exports: [ResultCountryRepository, ResultCountriesService],
})
export class ResultCountriesModule {}
