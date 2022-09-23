import { Module } from '@nestjs/common';
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { ResultsByInstitutionsController } from './results_by_institutions.controller';

@Module({
  controllers: [ResultsByInstitutionsController],
  providers: [ResultsByInstitutionsService]
})
export class ResultsByInstitutionsModule {}
