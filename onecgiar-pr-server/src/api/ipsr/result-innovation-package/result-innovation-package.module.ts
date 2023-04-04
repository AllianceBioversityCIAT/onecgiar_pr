import { Module } from '@nestjs/common';
import { ResultInnovationPackageService } from './result-innovation-package.service';
import { ResultInnovationPackageController } from './result-innovation-package.controller';
import { ResultRepository } from '../../../api/results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { VersionRepository } from '../../../api/results/versions/version.repository';
import { ResultInnovationPackageByInitiativeRepository } from '../results-package-by-initiatives/results-package-by-initiatives.respository';
import { VersionsModule } from '../../../api/results/versions/versions.module';
import { ResultRegionRepository } from '../../../api/results/result-regions/result-regions.repository';
import { ResultByInitiativesRepository } from '../../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultCountryRepository } from '../../../api/results/result-countries/result-countries.repository';
import { IpsrRepository } from '../ipsr.repository';
import { ResultInnovationPackageRepository } from './repositories/result-innovation-package.repository';
import { ResultIpAAOutcomeRepository } from '../innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ClarisaActionAreaOutcomeRepository } from '../../../clarisa/clarisa-action-area-outcome/clarisa-action-area-outcome.repository';
import { ResultsImpactAreaIndicatorRepository } from 'src/api/results/results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultIpImpactAreaRepository } from '../innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ActiveBackstoppingRepository } from './repositories/active-backstopping.repository';
import { consensusInitiativeWorkPackageRepository } from './repositories/consensus-initiative-work-package.repository';
import { RegionalIntegratedRepository } from './repositories/regional-integrated.repository';
import { RegionalLeadershipRepository } from './repositories/regional-leadership.repository';
import { RelevantCountryRepository } from './repositories/relevant-country.repository';

@Module({
  controllers: [ResultInnovationPackageController],
  providers: [
    ResultInnovationPackageService,
    ResultRepository,
    HandlersError,
    VersionRepository,
    ResultInnovationPackageByInitiativeRepository,
    ResultRegionRepository,
    ResultCountryRepository,
    ResultByInitiativesRepository,
    IpsrRepository,
    ResultInnovationPackageRepository,
    ResultIpAAOutcomeRepository,
    ClarisaActionAreaOutcomeRepository,
    ResultsImpactAreaIndicatorRepository,
    ResultIpImpactAreaRepository,
    ActiveBackstoppingRepository,
    consensusInitiativeWorkPackageRepository,
    RegionalIntegratedRepository,
    RegionalLeadershipRepository,
    RelevantCountryRepository
  ],
  imports: [VersionsModule],
  exports: [
    ResultInnovationPackageRepository
  ]
})
export class ResultInnovationPackageModule { }
