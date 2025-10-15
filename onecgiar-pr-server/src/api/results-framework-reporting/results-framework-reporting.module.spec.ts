import 'reflect-metadata';
import { ResultsFrameworkReportingModule } from './results-framework-reporting.module';
import { ResultsFrameworkReportingController } from './results-framework-reporting.controller';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ResultsModule } from '../results/results.module';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ClarisaGlobalUnitRepository } from '../../clarisa/clarisa-global-unit/clarisa-global-unit.repository';
import { YearRepository } from '../results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TocResultsRepository } from '../results/results-toc-results/repositories/toc-work-packages.repository';

describe('ResultsFrameworkReportingModule', () => {
  it('should wire controller metadata', () => {
    const controllers =
      Reflect.getMetadata('controllers', ResultsFrameworkReportingModule) ?? [];
    expect(controllers).toEqual(
      expect.arrayContaining([ResultsFrameworkReportingController]),
    );
  });

  it('should register required providers', () => {
    const providers =
      Reflect.getMetadata('providers', ResultsFrameworkReportingModule) ?? [];
    expect(providers).toEqual(
      expect.arrayContaining([
        ResultsFrameworkReportingService,
        ClarisaInitiativesRepository,
        RoleByUserRepository,
        ClarisaGlobalUnitRepository,
        YearRepository,
        HandlersError,
        TocResultsRepository,
      ]),
    );
  });

  it('should import the ResultsModule', () => {
    const importsMetadata =
      Reflect.getMetadata('imports', ResultsFrameworkReportingModule) ?? [];
    expect(importsMetadata).toEqual(expect.arrayContaining([ResultsModule]));
  });
});
