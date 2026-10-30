import { HttpStatus } from '@nestjs/common';
import { DeleteRecoverDataService } from './delete-recover-data.service';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultLevelEnum } from '../../shared/constants/result-level.enum';

/**
 * IRS-T-8 / IRS-R-13 — impact tables follow the result through soft delete and are hard-deleted
 * when the type changes away from Impact contribution (9). Built with `Object.create` (no DI).
 */
describe('DeleteRecoverDataService — impact tables (IRS-R-13)', () => {
  const repo = () => ({
    logicalDelete: jest.fn().mockResolvedValue(undefined),
    fisicalDelete: jest.fn().mockResolvedValue(undefined),
    fisicalContributorsDelete: jest.fn().mockResolvedValue(undefined),
    fisicalDeleteByTypeAndResultId: jest.fn().mockResolvedValue(undefined),
    fisicalDeleteByEvidenceIdAndResultId: jest
      .fn()
      .mockResolvedValue(undefined),
    fisicalDeleteLegacy: jest.fn().mockResolvedValue(undefined),
  });

  // Every `_xxxRepository` field that `deleteResult` / `deleteDataByNewResultType` read.
  const OTHER_REPOS = [
    '_ipsrRepository',
    '_innovationPackagingExpertRepository',
    '_resultIpExpertisesRepository',
    '_resultIpAAOutcomeRepository',
    '_resultIpEoiOutcomeRepository',
    '_resultIpExpertWorkshopOrganizedRepostory',
    '_resultIpImpactAreaRepository',
    '_resultIpSdgTargetRepository',
    '_resultInnovationPackageRepository',
    '_resultIpMeasureRepository',
    '_resultsByIpInnovationUseMeasureRepository',
    '_resultsComplementaryInnovationRepository',
    '_resultsComplementaryInnovationsFunctionRepository',
    '_resultsInnovationPackagesEnablerTypeRepository',
    '_resultsIpActorRepository',
    '_resultsIpInstitutionTypeRepository',
    '_linkedResultRepository',
    '_nonPooledProjectRepository',
    '_resultActorRepository',
    '_resultByInstitutionsByDeliveriesTypeRepository',
    '_resultCountryRepository',
    '_resultAnswerRepository',
    '_resultRegionRepository',
    '_resultsCenterRepository',
    '_resultsImpactAreaIndicatorRepository',
    '_resultsImpactAreaTargetRepository',
    '_resultsInvestmentDiscontinuedOptionRepository',
    '_resultsKnowledgeProductAltmetricRepository',
    '_resultsKnowledgeProductAuthorRepository',
    '_resultsKnowledgeProductKeywordRepository',
    '_resultsKnowledgeProductMetadataRepository',
    '_resultsKnowledgeProductsRepository',
    '_resultsActionAreaOutcomeRepository',
    '_resultsTocImpactAreaTargetRepository',
    '_resultsTocTargetIndicatorRepository',
    '_resultsTocSdgTargetRepository',
    '_resultsSdgTargetRepository',
    '_resultsTocResultIndicatorsRepository',
    '_resultsTocResultRepository',
    '_resultValidationRepository',
    '_evidenceSharepointRepository',
    '_resultByEvidencesRepository',
    '_resultByInitiativesRepository',
    '_resultByIntitutionsTypeRepository',
    '_resultByIntitutionsRepository',
    '_resultsCapacityDevelopmentsRepository',
    '_resultsInnovationsDevRepository',
    '_resultsInnovationsUseMeasuresRepository',
    '_resultsInnovationsUseRepository',
    '_resultsPolicyChangesRepository',
    '_shareResultRequestRepository',
    '_evidencesRepository',
    '_resultsKnowledgeProductFairScoreRepository',
    '_resultsKnowledgeProductInstitutionRepository',
    '_resultInstitutionsBudgetRepository',
    '_nonPooledProjectBudgetRepository',
    '_resultInitiativeBudgetRepository',
    '_resultCountriesSubNationalRepository',
    '_knowledgeProductFairBaselineRepository',
  ];

  let service: any;

  const build = (): any => {
    const svc: any = Object.create(DeleteRecoverDataService.prototype);
    svc._logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    svc._returnResponse = { format: jest.fn((x: any) => x) };
    for (const f of OTHER_REPOS) svc[f] = repo();
    svc._resultImpactLevelRepository = repo();
    svc._resultImpactPreviousResultRepository = repo();
    svc._resultRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        version_id: 4,
        status_id: 1,
        result_code: 77,
      }),
      logicalDelete: jest.fn().mockResolvedValue(undefined),
    };
    svc._roleByUserRepository = {
      validationRolePermissions: jest.fn().mockResolvedValue(true),
    };
    svc._versionRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 4, obj_portfolio: null }),
    };
    svc._resultDeletionAuditService = {
      recordDeletion: jest.fn().mockResolvedValue(undefined),
    };
    svc._resultsService = {
      findAllSimplified: jest
        .fn()
        .mockResolvedValue({ status: HttpStatus.NOT_FOUND }),
    };
    return svc;
  };

  beforeEach(() => {
    service = build();
  });

  describe('deleteResult', () => {
    it('soft-deletes both impact tables of the result', async () => {
      const out = await service.deleteResult(10, { id: 1 } as any, 'why');

      expect(out.statusCode).toBe(HttpStatus.OK);
      expect(
        service._resultImpactLevelRepository.logicalDelete,
      ).toHaveBeenCalledWith(10);
      expect(
        service._resultImpactPreviousResultRepository.logicalDelete,
      ).toHaveBeenCalledWith(10);
    });
  });

  describe('deleteDataByNewResultType', () => {
    const run = (oldType: ResultTypeEnum, newType: ResultTypeEnum) =>
      service.deleteDataByNewResultType(
        10,
        newType,
        ResultLevelEnum.INITIATIVE_OUTPUT,
        oldType,
        ResultLevelEnum.INITIATIVE_OUTPUT,
        4,
      );

    it('hard-deletes both impact tables when the type changes away from 9', async () => {
      const out = await run(
        ResultTypeEnum.IMPACT_CONTRIBUTION,
        ResultTypeEnum.OTHER_OUTPUT,
      );

      expect(out.statusCode).toBe(HttpStatus.OK);
      expect(
        service._resultImpactLevelRepository.fisicalDelete,
      ).toHaveBeenCalledWith(10);
      expect(
        service._resultImpactPreviousResultRepository.fisicalDelete,
      ).toHaveBeenCalledWith(10);
    });

    it('leaves the impact tables alone for any other old type', async () => {
      await run(
        ResultTypeEnum.OTHER_OUTPUT,
        ResultTypeEnum.INNOVATION_DEVELOPMENT,
      );

      expect(
        service._resultImpactLevelRepository.fisicalDelete,
      ).not.toHaveBeenCalled();
      expect(
        service._resultImpactPreviousResultRepository.fisicalDelete,
      ).not.toHaveBeenCalled();
    });

    it('awaits the impact deletes (a rejection surfaces in the response)', async () => {
      service._resultImpactLevelRepository.fisicalDelete.mockRejectedValue(
        new Error('boom'),
      );
      service._returnResponse.format = jest.fn((x: any) =>
        x instanceof Error
          ? { statusCode: HttpStatus.INTERNAL_SERVER_ERROR }
          : x,
      );

      const out = await run(
        ResultTypeEnum.IMPACT_CONTRIBUTION,
        ResultTypeEnum.OTHER_OUTPUT,
      );

      expect(out.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
