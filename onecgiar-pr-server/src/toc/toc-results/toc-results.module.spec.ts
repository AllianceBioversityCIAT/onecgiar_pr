import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { DataSource } from 'typeorm';

jest.mock('../../shared/services/share-point/share-point.module', () => ({
  SharePointModule: class SharePointModule {},
}));

jest.mock('../../api/m-qap/m-qap.module', () => ({
  MQAPModule: class MQAPModule {},
}));

jest.mock('../../api/versioning/versioning.module', () => ({
  VersioningModule: class VersioningModule {},
}));

jest.mock(
  '../../api/ipsr/result-innovation-package/result-innovation-package.module',
  () => ({
    ResultInnovationPackageModule: class ResultInnovationPackageModule {},
  }),
);

jest.mock(
  '../../api/ipsr/innovation-pathway/innovation-pathway.module',
  () => ({
    InnovationPathwayModule: class InnovationPathwayModule {},
  }),
);

import { TocResultsModule } from './toc-results.module';
import { TocResultsService } from './toc-results.service';
import { TocResultsController } from './toc-results.controller';
import { TocResultsRepository } from './toc-results.repository';
import { VersioningService } from '../../api/versioning/versioning.service';
import { VersionRepository } from '../../api/versioning/versioning.repository';
import { ApplicationModulesRepository } from '../../api/versioning/repositories/application-modules.repository';
import { ResultRepository } from '../../api/results/result.repository';
import { NonPooledProjectRepository } from '../../api/results/non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../../api/results/results-centers/results-centers.repository';
import { ResultsTocResultRepository } from '../../api/results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { ResultByIntitutionsRepository } from '../../api/results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../api/results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultByIntitutionsTypeRepository } from '../../api/results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultCountryRepository } from '../../api/results/result-countries/result-countries.repository';
import { ResultRegionRepository } from '../../api/results/result-regions/result-regions.repository';
import { LinkedResultRepository } from '../../api/results/linked-results/linked-results.repository';
import { EvidencesRepository } from '../../api/results/evidences/evidences.repository';
import { ResultsCapacityDevelopmentsRepository } from '../../api/results/summary/repositories/results-capacity-developments.repository';
import { ResultsImpactAreaIndicatorRepository } from '../../api/results/results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultsPolicyChangesRepository } from '../../api/results/summary/repositories/results-policy-changes.repository';
import { ResultsInnovationsDevRepository } from '../../api/results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../../api/results/summary/repositories/results-innovations-use.repository';
import { ResultsInnovationsUseMeasuresRepository } from '../../api/results/summary/repositories/results-innovations-use-measures.repository';
import { ResultsKnowledgeProductsRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductAltmetricRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductKeywordRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultsTocResultIndicatorsRepository } from '../../api/results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocSdgTargetRepository } from 'src/api/results/results-toc-results/repositories/result-toc-sdg-target.repository';
import { ResultsTocImpactAreaTargetRepository } from 'src/api/results/results-toc-results/repositories/result-toc-impact-area.repository';
import { ResultsSdgTargetRepository } from 'src/api/results/results-toc-results/repositories/results-sdg-targets.repository';
import { ResultsActionAreaOutcomeRepository } from 'src/api/results/results-toc-results/repositories/result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from 'src/api/results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultInitiativeBudgetRepository } from '../../api/results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../../api/results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../../api/results/result_budget/repositories/result_institutions_budget.repository';
import { EvidenceSharepointRepository } from '../../api/results/evidences/repositories/evidence-sharepoint.repository';
import { EvidencesService } from '../../api/results/evidences/evidences.service';
import { ShareResultRequestRepository } from '../../api/results/share-result-request/share-result-request.repository';
import { ResultActorRepository } from '../../api/results/result-actors/repositories/result-actors.repository';
import { ResultIpAAOutcomeRepository } from '../../api/ipsr/innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ResultIpEoiOutcomeRepository } from '../../api/ipsr/innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { ResultIpImpactAreaRepository } from '../../api/ipsr/innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ResultIpSdgTargetRepository } from '../../api/ipsr/innovation-pathway/repository/result-ip-sdg-targets.repository';
import { InnovationPackagingExpertRepository } from '../../api/ipsr/innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultIpMeasureRepository } from '../../api/ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultIpExpertisesRepository } from '../../api/ipsr/innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../../api/ipsr/innovation-pathway/repository/result-ip-expert-workshop-organized.repository';
import { ResultsIpActorRepository } from '../../api/ipsr/results-ip-actors/results-ip-actor.repository';
import { ResultsByIpInnovationUseMeasureRepository } from '../../api/ipsr/results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpInstitutionTypeRepository } from '../../api/ipsr/results-ip-institution-type/results-ip-institution-type.repository';
import { ResultCountrySubnationalRepository } from '../../api/results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultAnswerRepository } from '../../api/results/result-questions/repository/result-answers.repository';
import { ResultTypeRepository } from '../../api/results/result_types/resultType.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { YearRepository } from '../../api/results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

describe('TocResultsModule', () => {
  async function compileModule() {
    const moduleBuilder: TestingModuleBuilder = Test.createTestingModule({
      imports: [TocResultsModule],
    });

    moduleBuilder
      .overrideProvider(DataSource)
      .useValue({ createEntityManager: () => ({}) });
    moduleBuilder.overrideProvider(HandlersError).useValue({});
    moduleBuilder.overrideProvider(ResultTypeRepository).useValue({});

    const providersToMock = [
      TocResultsRepository,
      VersioningService,
      VersionRepository,
      ApplicationModulesRepository,
      ResultRepository,
      NonPooledProjectRepository,
      ResultsCenterRepository,
      ResultsTocResultRepository,
      ResultByInitiativesRepository,
      ResultsKnowledgeProductInstitutionRepository,
      ResultByIntitutionsRepository,
      ResultByInstitutionsByDeliveriesTypeRepository,
      ResultByIntitutionsTypeRepository,
      ResultCountryRepository,
      ResultRegionRepository,
      LinkedResultRepository,
      EvidencesRepository,
      ResultsCapacityDevelopmentsRepository,
      ResultsImpactAreaIndicatorRepository,
      ResultsPolicyChangesRepository,
      ResultsInnovationsDevRepository,
      ResultsInnovationsUseRepository,
      ResultsInnovationsUseMeasuresRepository,
      ResultsKnowledgeProductsRepository,
      ResultsKnowledgeProductAltmetricRepository,
      ResultsKnowledgeProductAuthorRepository,
      ResultsKnowledgeProductKeywordRepository,
      ResultsKnowledgeProductMetadataRepository,
      RoleByUserRepository,
      ResultsTocResultIndicatorsRepository,
      ResultsTocSdgTargetRepository,
      ResultsTocImpactAreaTargetRepository,
      ResultsSdgTargetRepository,
      ResultsActionAreaOutcomeRepository,
      ResultsTocTargetIndicatorRepository,
      ResultInitiativeBudgetRepository,
      NonPooledProjectBudgetRepository,
      ResultInstitutionsBudgetRepository,
      EvidenceSharepointRepository,
      ShareResultRequestRepository,
      ResultActorRepository,
      ResultIpAAOutcomeRepository,
      ResultIpEoiOutcomeRepository,
      ResultIpImpactAreaRepository,
      ResultIpSdgTargetRepository,
      InnovationPackagingExpertRepository,
      ResultIpMeasureRepository,
      ResultIpExpertisesRepository,
      ResultIpExpertWorkshopOrganizedRepostory,
      ResultsIpActorRepository,
      ResultsByIpInnovationUseMeasureRepository,
      ResultsIpInstitutionTypeRepository,
      ResultCountrySubnationalRepository,
      ResultAnswerRepository,
      ClarisaInitiativesRepository,
      EvidencesService,
      YearRepository,
    ];

    providersToMock.forEach((provider) => {
      moduleBuilder.overrideProvider(provider).useValue({});
    });

    return moduleBuilder.compile();
  }

  it('should compile the module and provide TocResultsService', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(TocResultsService)).toBeDefined();
  });

  it('should register TocResultsController', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(TocResultsController)).toBeDefined();
  });

  it('should export TocResultsRepository token', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(TocResultsRepository)).toBeDefined();
  });
});
