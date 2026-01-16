import 'reflect-metadata';
import { IpsrContributorsPartnersModule } from './ipsr_contributors-partners.module';
import { IpsrContributorsPartnersController } from './ipsr_contributors-partners.controller';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { ResultsByInstitutionsModule } from '../../results/results_by_institutions/results_by_institutions.module';
import { ResultsTocResultsModule } from '../../results/results-toc-results/results-toc-results.module';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { LinkedResultRepository } from '../../results/linked-results/linked-results.repository';
import { ResultsInnovationsUseRepository } from '../../results/summary/repositories/results-innovations-use.repository';
import { LinkedResultsModule } from '../../results/linked-results/linked-results.module';

describe('IpsrContributorsPartnersModule', () => {
  it('should be defined', () => {
    expect(IpsrContributorsPartnersModule).toBeDefined();
  });

  it('should register the ipsr contributors partners controller', () => {
    const controllers =
      (Reflect.getMetadata(
        'controllers',
        IpsrContributorsPartnersModule,
      ) as any[]) ?? [];

    expect(controllers).toContain(IpsrContributorsPartnersController);
  });

  it('should register expected providers', () => {
    const providers =
      (Reflect.getMetadata(
        'providers',
        IpsrContributorsPartnersModule,
      ) as any[]) ?? [];

    expect(providers).toEqual(
      expect.arrayContaining([
        IpsrContributorsPartnersService,
        HandlersError,
        ResultRepository,
        ResultByInitiativesRepository,
        ResultByIntitutionsRepository,
        LinkedResultRepository,
        ResultsInnovationsDevRepository,
        ResultsInnovationsUseRepository,
      ]),
    );
  });

  it('should import dependent modules', () => {
    const imports =
      (Reflect.getMetadata(
        'imports',
        IpsrContributorsPartnersModule,
      ) as any[]) ?? [];

    expect(imports).toEqual(
      expect.arrayContaining([
        ResultsByInstitutionsModule,
        ResultsTocResultsModule,
        LinkedResultsModule,
      ]),
    );
  });
});
