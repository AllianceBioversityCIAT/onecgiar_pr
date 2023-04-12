import { Module } from '@nestjs/common';
import { ResultsComplementaryInnovationsFunctionsService } from './results-complementary-innovations-functions.service';
import { ResultsComplementaryInnovationsFunctionsController } from './results-complementary-innovations-functions.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ComplementaryInnovationFunctionsRepository } from './repositories/complementary-innovation-functions.repository';
import { ResultsComplementaryInnovationsFunctionRepository } from './repositories/results-complementary-innovations-function.repository';

@Module({
  controllers: [ResultsComplementaryInnovationsFunctionsController],
  providers: [ResultsComplementaryInnovationsFunctionsService, HandlersError, ComplementaryInnovationFunctionsRepository, ResultsComplementaryInnovationsFunctionRepository]
})
export class ResultsComplementaryInnovationsFunctionsModule {}
