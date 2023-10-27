import { Module } from '@nestjs/common';
import { ResultsByInstitutionTypesService } from './results_by_institution_types.service';
import { ResultsByInstitutionTypesController } from './results_by_institution_types.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultByIntitutionsTypeRepository } from './result_by_intitutions_type.repository';

@Module({
  controllers: [ResultsByInstitutionTypesController],
  providers: [
    ResultsByInstitutionTypesService,
    HandlersError,
    ResultByIntitutionsTypeRepository,
    ReturnResponse,
  ],
  imports: [],
  exports: [ResultByIntitutionsTypeRepository],
})
export class ResultsByInstitutionTypesModule {}
