import { Module } from '@nestjs/common';
import { InnovationPathwayStepOneService } from './innovation-pathway-step-one.service';
import { InnovationPathwayController } from './innovation-pathway.controller';
import { ResultRepository } from '../../../api/results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../../api/results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../../api/results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersionRepository } from 'src/api/results/versions/version.repository';
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
import { InnovationPathwayStepTwoService } from './innovation-pathway-step-two.service';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsComplementaryInnovationsFunctionRepository } from '../results-complementary-innovations-functions/repositories/results-complementary-innovations-function.repository';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';

@Module({
  controllers: [InnovationPathwayController],
  providers: [
    InnovationPathwayStepOneService,
    InnovationPathwayStepTwoService,
    HandlersError,
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
    ResultsComplementaryInnovationRepository,
    ResultsComplementaryInnovationsFunctionRepository,
    EvidencesRepository

  ]
})
export class InnovationPathwayModule { }
