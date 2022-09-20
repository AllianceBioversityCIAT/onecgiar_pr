import { Module } from '@nestjs/common';
import { ClarisaCountriesRegionsService } from './clarisa-countries-regions.service';
import { ClarisaCountriesRegionsController } from './clarisa-countries-regions.controller';

@Module({
  controllers: [ClarisaCountriesRegionsController],
  providers: [ClarisaCountriesRegionsService]
})
export class ClarisaCountriesRegionsModule {}
