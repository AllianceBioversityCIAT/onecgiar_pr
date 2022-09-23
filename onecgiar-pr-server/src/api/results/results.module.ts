import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { RouterModule } from '@nestjs/core';
import { ResultsRoutes } from './results.routes';
import { ResultLevelsModule } from './result_levels/result_levels.module';
import { ResultTypesModule } from './result_types/result_types.module';
import { GenderTagLevelsModule } from './gender_tag_levels/gender_tag_levels.module';
import { UsersModule } from './users/users.module';
import { VersionsModule } from './versions/versions.module';
import { InstitutionRolesModule } from './institution_roles/institution_roles.module';
import { ResultsByInititiativesModule } from './results_by_inititiatives/results_by_inititiatives.module';
import { ResultsByInstitutionsModule } from './results_by_institutions/results_by_institutions.module';
import { ResultsByInstitutionTypesModule } from './results_by_institution_types/results_by_institution_types.module';
import { EvidencesModule } from './evidences/evidences.module';
import { ResultsByEvidencesModule } from './results_by_evidences/results_by_evidences.module';
import { EvidenceTypesModule } from './evidence_types/evidence_types.module';
import { InitiativeRolesModule } from './initiative_roles/initiative_roles.module';

@Module({
  controllers: [ResultsController],
  imports: [RouterModule.register(ResultsRoutes), ResultLevelsModule, ResultTypesModule, GenderTagLevelsModule, UsersModule, VersionsModule, InstitutionRolesModule, ResultsByInititiativesModule, ResultsByInstitutionsModule, ResultsByInstitutionTypesModule, EvidencesModule, ResultsByEvidencesModule, EvidenceTypesModule, InitiativeRolesModule],
  providers: [ResultsService],
})
export class ResultsModule {}
