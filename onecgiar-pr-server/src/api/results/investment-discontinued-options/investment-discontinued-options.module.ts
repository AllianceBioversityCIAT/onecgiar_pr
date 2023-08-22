import { Module } from '@nestjs/common';
import { InvestmentDiscontinuedOptionsService } from './investment-discontinued-options.service';
import { InvestmentDiscontinuedOptionsController } from './investment-discontinued-options.controller';
import { InvestmentDiscontinuedOptionRepository } from './investment-discontinued-options.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';

@Module({
  controllers: [InvestmentDiscontinuedOptionsController],
  providers: [
    InvestmentDiscontinuedOptionsService,
    InvestmentDiscontinuedOptionRepository,
    ReturnResponse,
    HandlersError,
  ],
})
export class InvestmentDiscontinuedOptionsModule {}
