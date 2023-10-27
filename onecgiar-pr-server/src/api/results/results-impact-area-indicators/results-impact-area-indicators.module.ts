import { Module } from '@nestjs/common';
import { ResultsImpactAreaIndicatorsService } from './results-impact-area-indicators.service';
import { ResultsImpactAreaIndicatorsController } from './results-impact-area-indicators.controller';
import { ResultsImpactAreaIndicatorRepository } from './results-impact-area-indicators.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsImpactAreaIndicatorsController],
  providers: [
    ResultsImpactAreaIndicatorsService,
    ResultsImpactAreaIndicatorRepository,
    HandlersError,
  ],
  exports: [ResultsImpactAreaIndicatorRepository],
})
export class ResultsImpactAreaIndicatorsModule {}
