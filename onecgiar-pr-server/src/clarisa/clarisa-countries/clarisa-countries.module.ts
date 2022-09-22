import { Module } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { ClarisaCountriesController } from './clarisa-countries.controller';
import { ClarisaCountriesRepository } from './ClarisaCountries.repository';

@Module({
  controllers: [ClarisaCountriesController],
  providers: [
    ClarisaCountriesService,
    ClarisaCountriesRepository
  ],
  exports:[
    ClarisaCountriesRepository
  ]
})
export class ClarisaCountriesModule {}
