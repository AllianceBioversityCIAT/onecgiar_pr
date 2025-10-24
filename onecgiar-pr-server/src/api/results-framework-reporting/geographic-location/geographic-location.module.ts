import { Module } from '@nestjs/common';
import { GeographicLocationService } from './geographic-location.service';
import { GeographicLocationController } from './geographic-location.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRegionsModule } from '../../results/result-regions/result-regions.module';
import { ResultCountriesModule } from '../../results/result-countries/result-countries.module';
import { ResultsModule } from '../../results/results.module';
import { ElasticModule } from '../../../elastic/elastic.module';

@Module({
  imports: [
    ResultCountriesModule,
    ResultsModule,
    ElasticModule,
    ResultRegionsModule,
  ],
  controllers: [GeographicLocationController],
  providers: [GeographicLocationService, HandlersError, ReturnResponse],
})
export class GeographicLocationModule {}