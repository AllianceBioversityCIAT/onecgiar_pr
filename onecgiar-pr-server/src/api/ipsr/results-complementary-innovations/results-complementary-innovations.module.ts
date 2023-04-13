import { Module } from '@nestjs/common';
import { ResultsComplementaryInnovationsService } from './results-complementary-innovations.service';
import { ResultsComplementaryInnovationsController } from './results-complementary-innovations.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsComplementaryInnovationRepository } from './repositories/results-complementary-innovation.repository';

@Module({
  controllers: [ResultsComplementaryInnovationsController],
  providers: [ResultsComplementaryInnovationsService, HandlersError, ResultsComplementaryInnovationRepository]
})
export class ResultsComplementaryInnovationsModule {}
