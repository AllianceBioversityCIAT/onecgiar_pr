import { forwardRef, Module } from '@nestjs/common';
import { PathwayService } from './pathway.service';
import { PathwayController } from './pathway.controller';
import { VersioningModule } from '../../versioning/versioning.module';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultInnovationPackageRepository } from '../../ipsr/result-innovation-package/repositories/result-innovation-package.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultScalingStudyUrl } from '../../results-framework-reporting/result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';
import { ResultsByProjectsService } from '../../results/results_by_projects/results_by_projects.service';
import { IpsrPathwayStepOneService } from './ipsr-pathway-step-one.service';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { IpsrRepository } from '../../ipsr/ipsr.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpSdgTargetRepository } from '../../ipsr/innovation-pathway/repository/result-ip-sdg-targets.repository';
import { ResultIpEoiOutcomeRepository } from '../../ipsr/innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { ResultIpAAOutcomeRepository } from '../../ipsr/innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultIpImpactAreaRepository } from '../../ipsr/innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ResultCountrySubnationalRepository } from '../../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../../ipsr/innovation-pathway/repository/result-ip-expert-workshop-organized.repository';

@Module({
  controllers: [PathwayController],
  providers: [
    PathwayService,
    HandlersError,
    ResultRepository,
    ResultInnovationPackageRepository,
    EvidencesRepository,
    NonPooledProjectRepository,
    ResultByInitiativesRepository,
    ResultsByProjectsRepository,
    ResultInitiativeBudgetRepository,
    NonPooledProjectBudgetRepository,
    ResultByIntitutionsRepository,
    ResultInstitutionsBudgetRepository,
    IpsrPathwayStepFourService,
    ResultsByProjectsService,
    IpsrPathwayStepOneService,
    ResultRegionRepository,
    ResultCountryRepository,
    IpsrRepository,
    ResultByInstitutionsByDeliveriesTypeRepository,
    ResultIpSdgTargetRepository,
    ResultIpEoiOutcomeRepository,
    ResultIpAAOutcomeRepository,
    ResultActorRepository,
    ResultByIntitutionsTypeRepository,
    ResultIpMeasureRepository,
    ResultIpImpactAreaRepository,
    ResultCountrySubnationalRepository,
    ResultIpExpertWorkshopOrganizedRepostory,
  ],
  imports: [
    forwardRef(() => VersioningModule),
    TypeOrmModule.forFeature([ResultScalingStudyUrl]),
  ],
})
export class PathwayModule {}
