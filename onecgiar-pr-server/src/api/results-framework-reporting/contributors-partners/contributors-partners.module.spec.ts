import 'reflect-metadata';
import { ContributorsPartnersModule } from './contributors-partners.module';
import { ContributorsPartnersController } from './contributors-partners.controller';
import { ContributorsPartnersService } from './contributors-partners.service';
import { ResultsByInstitutionsModule } from '../../results/results_by_institutions/results_by_institutions.module';
import { ResultsTocResultsModule } from '../../results/results-toc-results/results-toc-results.module';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';

describe('ContributorsPartnersModule', () => {
  it('should be defined', () => {
    expect(ContributorsPartnersModule).toBeDefined();
  });

  it('should register the contributors partners controller', () => {
    const controllers =
      (Reflect.getMetadata(
        'controllers',
        ContributorsPartnersModule,
      ) as any[]) ?? [];

    expect(controllers).toContain(ContributorsPartnersController);
  });

  it('should register expected providers', () => {
    const providers =
      (Reflect.getMetadata('providers', ContributorsPartnersModule) as any[]) ??
      [];

    expect(providers).toEqual(
      expect.arrayContaining([
        ContributorsPartnersService,
        HandlersError,
        ResultRepository,
        ResultByInitiativesRepository,
        ResultByIntitutionsRepository,
        ResultsCenterRepository,
        ResultsByProjectsRepository,
      ]),
    );
  });

  it('should import dependent modules', () => {
    const imports =
      (Reflect.getMetadata('imports', ContributorsPartnersModule) as any[]) ??
      [];

    expect(imports).toEqual(
      expect.arrayContaining([
        ResultsByInstitutionsModule,
        ResultsTocResultsModule,
      ]),
    );
  });
});
