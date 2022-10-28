import { Module } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { ClarisaCountriesController } from './clarisa-countries.controller';
import { ClarisaCountriesRepository } from './ClarisaCountries.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaCountriesController],
  providers: [ClarisaCountriesService, ClarisaCountriesRepository, HandlersError],
  exports: [ClarisaCountriesRepository],
})
export class ClarisaCountriesModule {}
