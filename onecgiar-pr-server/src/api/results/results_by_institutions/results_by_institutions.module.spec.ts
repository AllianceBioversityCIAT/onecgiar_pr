import 'reflect-metadata';
import { ResultsByInstitutionsModule } from './results_by_institutions.module';
import { ResultsByInstitutionsController } from './results_by_institutions.controller';
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { ResultsByProjectsModule } from '../results_by_projects/results_by_projects.module';

describe('ResultsByInstitutionsModule', () => {
  it('registers the expected controller', () => {
    const controllers =
      Reflect.getMetadata('controllers', ResultsByInstitutionsModule) ?? [];
    expect(controllers).toEqual(
      expect.arrayContaining([ResultsByInstitutionsController]),
    );
  });

  it('provides the service and repository tokens', () => {
    const providers =
      Reflect.getMetadata('providers', ResultsByInstitutionsModule) ?? [];
    expect(providers).toEqual(
      expect.arrayContaining([
        ResultsByInstitutionsService,
        ResultByIntitutionsRepository,
      ]),
    );
  });

  it('exports the service for reuse in other modules', () => {
    const exportsMetadata =
      Reflect.getMetadata('exports', ResultsByInstitutionsModule) ?? [];
    expect(exportsMetadata).toEqual(
      expect.arrayContaining([
        ResultsByInstitutionsService,
        ResultByIntitutionsRepository,
      ]),
    );
  });

  it('imports required project linkage module', () => {
    const importsMetadata =
      Reflect.getMetadata('imports', ResultsByInstitutionsModule) ?? [];
    expect(importsMetadata).toEqual(
      expect.arrayContaining([ResultsByProjectsModule]),
    );
  });
});
