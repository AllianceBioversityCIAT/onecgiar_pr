import { Routes } from '@nestjs/core';
import { ClarisaActionAreasModule } from './clarisa-action-areas/clarisa-action-areas.module';
import { ClarisaActionAreasOutcomesIndicatorsModule } from './clarisa-action-areas-outcomes-indicators/clarisa-action-areas-outcomes-indicators.module';
import { ClarisaGlobalTargetModule } from './clarisa-global-target/clarisa-global-target.module';
import { ClarisaImpactAreaModule } from './clarisa-impact-area/clarisa-impact-area.module';
import { ClarisaImpactAreaIndicatorsModule } from './clarisa-impact-area-indicators/clarisa-impact-area-indicators.module';
import { ClarisaInstitutionsModule } from './clarisa-institutions/clarisa-institutions.module';
import { ClarisaInstitutionsTypeModule } from './clarisa-institutions-type/clarisa-institutions-type.module';
import { ClarisaMeliaStudyTypeModule } from './clarisa-melia-study-type/clarisa-melia-study-type.module';
import { ClarisaCountriesModule } from './clarisa-countries/clarisa-countries.module';
import { ClarisaRegionsModule } from './clarisa-regions/clarisa-regions.module';
import { ClarisaGeographicScopesModule } from './clarisa-geographic-scopes/clarisa-geographic-scopes.module';
import { ClarisaCentersModule } from './clarisa-centers/clarisa-centers.module';
import { ClarisaInitiativesModule } from './clarisa-initiatives/clarisa-initiatives.module';
import { ClarisaInnovationTypeModule } from './clarisa-innovation-type/clarisa-innovation-type.module';
import { ClarisaInnovationReadinessLevelsModule } from './clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.module';
import { ClarisaInnovationCharacteristicsModule } from './clarisa-innovation-characteristics/clarisa-innovation-characteristics.module';
import { ClarisaPolicyStagesModule } from './clarisa-policy-stages/clarisa-policy-stages.module';
import { ClarisaPolicyTypesModule } from './clarisa-policy-types/clarisa-policy-types.module';
import { ClarisaSdgsModule } from './clarisa-sdgs/clarisa-sdgs.module';
import { ClarisaSdgsTargetsModule } from './clarisa-sdgs-targets/clarisa-sdgs-targets.module';
import { ClarisaActionAreaOutcomeModule } from './clarisa-action-area-outcome/clarisa-action-area-outcome.module';
import { ClarisaSecondOrderAdministrativeDivisionModule } from './clarisa-second-order-administrative-division/clarisa-second-order-administrative-division.module';
import { ClarisaFirstOrderAdministrativeDivisionModule } from './clarisa-first-order-administrative-division/clarisa-first-order-administrative-division.module';
import { ClarisaInnovationUseLevelsModule } from './clarisa-innovation-use-levels/clarisa-innovation-use-levels.module';
import { ClarisaTocPhasesModule } from './clarisa-toc-phases/clarisa-toc-phases.module';
import { ClarisaSubnationalScopeModule } from './clarisa-subnational-scope/clarisa-subnational-scope.module';
import { ClarisaCgiarEntityTypesModule } from './clarisa-cgiar-entity-types/clarisa-cgiar-entity-types.module';
import { ClarisaInitiativeStageModule } from './clarisa-initiative-stage/clarisa-initiative-stage.module';
import { ClarisaPortfoliosModule } from './clarisa-portfolios/clarisa-portfolios.module';
import { ClarisaGlobalUnitModule } from './clarisa-global-unit/clarisa-global-unit.module';

export const ClarisaRoutes: Routes = [
  {
    path: 'action-areas',
    module: ClarisaActionAreasModule,
  },
  {
    path: 'action-areas-outcomes',
    module: ClarisaActionAreaOutcomeModule,
  },
  {
    path: 'action-areas-outcomes-indicators',
    module: ClarisaActionAreasOutcomesIndicatorsModule,
  },
  {
    path: 'global-target',
    module: ClarisaGlobalTargetModule,
  },
  {
    path: 'impact-area',
    module: ClarisaImpactAreaModule,
  },
  {
    path: 'impact-area-indicators',
    module: ClarisaImpactAreaIndicatorsModule,
  },
  {
    path: 'institutions',
    module: ClarisaInstitutionsModule,
  },
  {
    path: 'institutions-type',
    module: ClarisaInstitutionsTypeModule,
  },
  {
    path: 'melia-study-type',
    module: ClarisaMeliaStudyTypeModule,
  },
  {
    path: 'countries',
    module: ClarisaCountriesModule,
  },
  {
    path: 'regions',
    module: ClarisaRegionsModule,
  },
  {
    path: 'geographic-scope',
    module: ClarisaGeographicScopesModule,
  },
  {
    path: 'centers',
    module: ClarisaCentersModule,
  },
  {
    path: 'initiatives',
    module: ClarisaInitiativesModule,
  },
  {
    path: 'innovation-type',
    module: ClarisaInnovationTypeModule,
  },
  {
    path: 'innovation-readiness-levels',
    module: ClarisaInnovationReadinessLevelsModule,
  },
  {
    path: 'innovation-characteristics',
    module: ClarisaInnovationCharacteristicsModule,
  },
  {
    path: 'policy-stages',
    module: ClarisaPolicyStagesModule,
  },
  {
    path: 'policy-types',
    module: ClarisaPolicyTypesModule,
  },
  {
    path: 'sdgs',
    module: ClarisaSdgsModule,
  },
  {
    path: 'sdgs-targets',
    module: ClarisaSdgsTargetsModule,
  },
  {
    path: 'second-order-administrative-division',
    module: ClarisaSecondOrderAdministrativeDivisionModule,
  },
  {
    path: 'first-order-administrative-division',
    module: ClarisaFirstOrderAdministrativeDivisionModule,
  },
  {
    path: 'innovation-use-levels',
    module: ClarisaInnovationUseLevelsModule,
  },
  {
    path: 'toc-phases',
    module: ClarisaTocPhasesModule,
  },
  {
    path: 'subnational-scope',
    module: ClarisaSubnationalScopeModule,
  },
  {
    path: 'cgiar-entity-types',
    module: ClarisaCgiarEntityTypesModule,
  },
  {
    path: 'initiative-stages',
    module: ClarisaInitiativeStageModule,
  },
  {
    path: 'portfolios',
    module: ClarisaPortfoliosModule,
  },
  {
    path: 'global-unit',
    module: ClarisaGlobalUnitModule,
  },
];
