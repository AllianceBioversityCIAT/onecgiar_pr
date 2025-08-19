import { Module, forwardRef } from '@nestjs/common';
import { InnovationPathwayStepOneService } from './innovation-pathway-step-one.service';
import { InnovationPathwayController } from './innovation-pathway.controller';
import { ResultRepository } from '../../../api/results/result.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../../api/results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../../api/results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersionRepository } from 'src/api/versioning/versioning.repository';
import { IpsrRepository } from '../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultIpEoiOutcomeRepository } from './repository/result-ip-eoi-outcomes.repository';
import { ResultIpAAOutcomeRepository } from './repository/result-ip-action-area-outcome.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../result-ip-measures/result-ip-measures.repository';
import { ResultIpImpactAreaRepository } from './repository/result-ip-impact-area-targets.repository';
import { ClarisaInstitutionsTypeRepository } from '../../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { InnovationPathwayStepTwoService } from './innovation-pathway-step-two.service';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsComplementaryInnovationsFunctionRepository } from '../results-complementary-innovations-functions/repositories/results-complementary-innovations-function.repository';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';
import { InnovationPathwayStepThreeService } from './innovation-pathway-step-three.service';
import { ResultsByIpInnovationUseMeasureRepository } from '../results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpActorRepository } from '../results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../results-ip-institution-type/results-ip-institution-type.repository';
import { YearRepository } from '../../../api/results/years/year.repository';
import { ResultByInitiativesRepository } from '../../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ComplementaryInnovationFunctionsRepository } from '../results-complementary-innovations-functions/repositories/complementary-innovation-functions.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { InnovationPathwayStepFourService } from './innovation-pathway-step-four.service';
import { ResultInitiativeBudgetRepository } from '../../../api/results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectRepository } from '../../../api/results/non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultIpExpertisesRepository } from '../innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from './repository/result-ip-expert-workshop-organized.repository';
import { VersioningModule } from '../../versioning/versioning.module';
import { ResultCountrySubnationalRepository } from '../../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultInnovationPackageService } from '../result-innovation-package/result-innovation-package.service';
import { ClarisaActionAreaOutcomeRepository } from '../../../clarisa/clarisa-action-area-outcome/clarisa-action-area-outcome.repository';
import { ActiveBackstoppingRepository } from '../result-innovation-package/repositories/active-backstopping.repository';
import { consensusInitiativeWorkPackageRepository } from '../result-innovation-package/repositories/consensus-initiative-work-package.repository';
import { RegionalIntegratedRepository } from '../result-innovation-package/repositories/regional-integrated.repository';
import { RegionalLeadershipRepository } from '../result-innovation-package/repositories/regional-leadership.repository';
import { RelevantCountryRepository } from '../result-innovation-package/repositories/relevant-country.repository';
import { ResultByEvidencesRepository } from '../../results/results_by_evidences/result_by_evidences.repository';
import { resultValidationRepository } from '../../results/results-validation-module/results-validation-module.repository';
import { UnitTimeRepository } from '../result-innovation-package/repositories/unit_time.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';
import { IpsrService } from '../ipsr.service';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { AdUsersModule } from '../../ad_users';
import { InitiativeEntityMapRepository } from '../../initiative_entity_map/initiative_entity_map.repository';

@Module({
  controllers: [InnovationPathwayController],
  imports: [forwardRef(() => VersioningModule), AdUsersModule],
  providers: [
    InnovationPathwayStepOneService,
    InnovationPathwayStepTwoService,
    HandlersError,
    ReturnResponse,
    ResultRepository,
    ResultRegionRepository,
    ResultCountryRepository,
    ExpertisesRepository,
    InnovationPackagingExpertRepository,
    ResultInnovationPackageRepository,
    VersionsService,
    VersionRepository,
    IpsrRepository,
    ResultByIntitutionsRepository,
    ResultByInstitutionsByDeliveriesTypeRepository,
    ResultIpSdgTargetRepository,
    ResultIpEoiOutcomeRepository,
    ResultIpAAOutcomeRepository,
    ResultActorRepository,
    ResultByIntitutionsTypeRepository,
    ResultIpMeasureRepository,
    ResultIpImpactAreaRepository,
    ClarisaInstitutionsTypeRepository,
    ResultsComplementaryInnovationRepository,
    ResultsComplementaryInnovationsFunctionRepository,
    EvidencesRepository,
    InnovationPathwayStepThreeService,
    ResultsByIpInnovationUseMeasureRepository,
    ResultsIpActorRepository,
    ResultsIpInstitutionTypeRepository,
    YearRepository,
    ResultByInitiativesRepository,
    ComplementaryInnovationFunctionsRepository,
    ClarisaInstitutionsRepository,
    InnovationPathwayStepFourService,
    ResultInitiativeBudgetRepository,
    NonPooledProjectRepository,
    NonPooledProjectBudgetRepository,
    ResultInstitutionsBudgetRepository,
    ResultIpExpertisesRepository,
    ResultCountrySubnationalRepository,
    ResultInnovationPackageService,
    ClarisaActionAreaOutcomeRepository,
    ActiveBackstoppingRepository,
    ResultIpExpertWorkshopOrganizedRepostory,
    consensusInitiativeWorkPackageRepository,
    RegionalIntegratedRepository,
    RegionalLeadershipRepository,
    RelevantCountryRepository,
    ResultByEvidencesRepository,
    resultValidationRepository,
    UnitTimeRepository,
    TocResultsRepository,
    IpsrService,
    ResultsInvestmentDiscontinuedOptionRepository,
    InitiativeEntityMapRepository,
  ],
})
export class InnovationPathwayModule {}
