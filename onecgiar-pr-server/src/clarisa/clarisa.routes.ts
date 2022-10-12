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

export const ClarisaRoutes: Routes = [
  {
    path: 'action-areas',
    module: ClarisaActionAreasModule,
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
    module: ClarisaCountriesModule
  }
];
