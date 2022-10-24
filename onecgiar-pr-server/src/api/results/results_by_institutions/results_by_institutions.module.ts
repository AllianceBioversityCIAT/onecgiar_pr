import {
  Module,
} from '@nestjs/common';
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { ResultsByInstitutionsController } from './results_by_institutions.controller';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';

@Module({
  controllers: [ResultsByInstitutionsController],
  providers: [
    ResultsByInstitutionsService,
    ResultByIntitutionsRepository,
    ResultRepository,
    HandlersError,
  ],
  imports: [],
  exports: [ResultByIntitutionsRepository],
})
export class ResultsByInstitutionsModule{}
