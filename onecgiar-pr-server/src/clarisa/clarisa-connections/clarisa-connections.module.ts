import { Module } from '@nestjs/common';
import { ClarisaConnectionsService } from './clarisa-connections.service';
import { ClarisaConnectionsController } from './clarisa-connections.controller';
import { HttpModule } from '@nestjs/axios';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaCronsService } from '../clarisaCron.service';
import { ClarisaTaskService } from '../clarisatask.service';
import { ClarisaMeliaStudyTypeRepository } from '../clarisa-melia-study-type/ClariasaMeliasStudyType.repository';
import { ClariasaActionAreaRepository } from '../clarisa-action-areas/ClariasaActionArea.repository';
import { ClarisaInitiativesRepository } from '../clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaImpactAreaRepository } from '../clarisa-impact-area/ClarisaImpactArea.repository';
import { ClarisaImpactAreaInticatorsRepository } from '../clarisa-impact-area-indicators/ClarisaImpactAreaIndicators.repository';
import { ClarisaCountriesRepository } from '../clarisa-countries/ClarisaCountries.repository';
import { ClarisaOutcomeIndicatorsRepository } from '../clarisa-outcome-indicators/ClariasaOutcomeIndicators.repository';
import { ClarisaRegionsRepository } from '../clarisa-regions/ClariasaRegions.repository';
import { ClarisaRegionsTypeRepository } from '../clarisa-region-types/ClariasaRegionsTypes.repository';
import { ClarisaGobalTargetRepository } from '../clarisa-global-target/ClariasaGlobalTarget.repository';
import { ClarisaInstitutionsRepository } from '../clarisa-institutions/ClariasaInstitutions.repository';
import { ClarisaInstitutionsTypeRepository } from '../clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { ClarisaPolicyStageRepository } from '../clarisa-policy-stages/clarisa-policy-stages.repository';
import { ClarisaInnovationTypeRepository } from '../clarisa-innovation-type/clarisa-innovation-type.repository';
import { ClarisaInnovationReadinessLevelRepository } from '../clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.repository';
import { ClarisaInnovationCharacteristicRepository } from '../clarisa-innovation-characteristics/clarisa-innovation-characteristics.repository';
import { ClarisaGeographicScopeRepository } from '../clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultByInitiativesRepository } from '../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaActionAreaOutcomeRepository } from '../clarisa-action-area-outcome/clarisa-action-area-outcome.repository';
import { TocResultsRepository } from '../../toc/toc-results/toc-results.repository';

@Module({
  controllers: [ClarisaConnectionsController],
  providers: [ClarisaConnectionsService, HandlersError, ClarisaCronsService, ClarisaTaskService,
    ClarisaMeliaStudyTypeRepository,
    ClariasaActionAreaRepository,
    ClarisaInitiativesRepository,
    ClarisaImpactAreaRepository,
    ClarisaImpactAreaInticatorsRepository,
    ClarisaCountriesRepository,
    ClarisaOutcomeIndicatorsRepository,
    ClarisaRegionsTypeRepository,
    ClarisaRegionsRepository,
    ClarisaGobalTargetRepository,
    ClarisaInstitutionsRepository,
    ClarisaInstitutionsTypeRepository,
    ClarisaPolicyStageRepository,
    ClarisaInnovationTypeRepository,
    ClarisaInnovationReadinessLevelRepository,
    ClarisaInnovationCharacteristicRepository,
    ClarisaGeographicScopeRepository,
    ResultByInitiativesRepository,
    ClarisaActionAreaOutcomeRepository,
    TocResultsRepository
  ],
  imports:[
    HttpModule
  ]
})
export class ClarisaConnectionsModule {}
