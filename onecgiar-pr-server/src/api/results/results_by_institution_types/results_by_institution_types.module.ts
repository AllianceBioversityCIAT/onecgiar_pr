import { Module } from '@nestjs/common';
import { ResultsByInstitutionTypesService } from './results_by_institution_types.service';
import { ResultsByInstitutionTypesController } from './results_by_institution_types.controller';

@Module({
  controllers: [ResultsByInstitutionTypesController],
  providers: [ResultsByInstitutionTypesService]
})
export class ResultsByInstitutionTypesModule {}
