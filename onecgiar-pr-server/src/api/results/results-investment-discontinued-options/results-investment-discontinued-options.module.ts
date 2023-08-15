import { Module } from '@nestjs/common';
import { ResultsInvestmentDiscontinuedOptionsService } from './results-investment-discontinued-options.service';
import { ResultsInvestmentDiscontinuedOptionsController } from './results-investment-discontinued-options.controller';
import { ResultsInvestmentDiscontinuedOptionRepository } from './results-investment-discontinued-options.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsInvestmentDiscontinuedOptionsController],
  providers: [
    ResultsInvestmentDiscontinuedOptionsService,
    ResultsInvestmentDiscontinuedOptionRepository,
    HandlersError,
  ],
})
export class ResultsInvestmentDiscontinuedOptionsModule {}
