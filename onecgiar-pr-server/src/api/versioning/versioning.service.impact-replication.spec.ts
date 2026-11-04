import { VersioningService } from './versioning.service';

/**
 * IRS-T-8 / IRS-R-14 — `case 9` of `$_phaseChangeReporting` replicates the impact-level rows.
 * Built with `Object.create` (no DI graph): only the collaborators the replication touches are
 * stubbed, so the spec stays about the branch under test.
 */
describe('VersioningService.$_phaseChangeReporting — impact results (IRS-R-14)', () => {
  const REPLICATING_FIELDS = [
    '_resultByInitiativesRepository',
    '_shareResultRequestRepository',
    '_resultInitiativeBudgetRepository',
    '_resultNonPooledProjectBudgetRepository',
    '_resultsPolicyChangesRepository',
    '_resultsInnovationsUseRepository',
    '_resultsInnovationsUseMeasuresRepository',
    '_resultActorRepository',
    '_resultIpMeasureRepository',
    '_resultsCapacityDevelopmentsRepository',
    '_resultsKnowledgeProductsRepository',
    '_resultsKnowledgeProductAltmetricRepository',
    '_resultsKnowledgeProductAuthorRepository',
    '_resultsKnowledgeProductKeywordRepository',
    '_resultsKnowledgeProductMetadataRepository',
    '_resultsKnowledgeProductInstitutionRepository',
    '_resultsInnovationsDevRepository',
    '_resultAnswerRepository',
    '_nonPooledProjectRepository',
    '_resultsCenterRepository',
    '_resultByIntitutionsRepository',
    '_resultByInstitutionsByDeliveriesTypeRepository',
    '_resultByIntitutionsTypeRepository',
    '_resultInstitutionsBudgetRepository',
    '_resultCountryRepository',
    '_resultCountrySubnationalRepository',
    '_resultRegionRepository',
    '_linkedResultRepository',
    '_evidencesRepository',
    '_evidenceSharepointRepository',
    '_resultImpactLevelRepository',
    '_resultImpactPreviousResultRepository',
  ];

  const mockUser: any = { id: 9 };
  const mockPhase: any = { id: 36, phase_name: 'Reporting 2026' };
  const newResult: any = { id: 8001, result_code: 100 };
  const manager: any = { update: jest.fn().mockResolvedValue({}) };

  let service: any;

  const build = (): any => {
    const svc: any = Object.create(VersioningService.prototype);
    svc._logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    svc.dataSource = {
      transaction: jest.fn(async (cb: any) => cb(manager)),
    };
    svc._resultRepository = {
      replicate: jest.fn().mockResolvedValue([{ ...newResult }]),
    };
    for (const field of REPLICATING_FIELDS) {
      svc[field] = {
        replicate: jest.fn().mockResolvedValue([]),
        replicateScalingStudyUrls: jest.fn().mockResolvedValue(undefined),
        ensureMissingBudgetsForPrimaryInitiatives: jest
          .fn()
          .mockResolvedValue(undefined),
      };
    }
    svc.transformInnovationDevAnswersFor2026 = jest
      .fn()
      .mockResolvedValue(undefined);
    return svc;
  };

  beforeEach(() => {
    service = build();
  });

  it('replicates both impact tables to the new result id for a type 9 result', async () => {
    await service.$_phaseChangeReporting(
      { id: 5001, result_code: 100, result_type_id: 9 },
      mockPhase,
      mockUser,
    );

    const expected = expect.objectContaining({
      old_result_id: 5001,
      new_result_id: 8001,
    });
    expect(
      service._resultImpactLevelRepository.replicate,
    ).toHaveBeenCalledTimes(1);
    expect(service._resultImpactLevelRepository.replicate).toHaveBeenCalledWith(
      manager,
      expected,
    );
    expect(
      service._resultImpactPreviousResultRepository.replicate,
    ).toHaveBeenCalledTimes(1);
    expect(
      service._resultImpactPreviousResultRepository.replicate,
    ).toHaveBeenCalledWith(manager, expected);
  });

  it('does not touch the impact repositories for other result types (type 7)', async () => {
    await service.$_phaseChangeReporting(
      { id: 5002, result_code: 100, result_type_id: 7 },
      mockPhase,
      mockUser,
    );

    expect(
      service._resultsInnovationsDevRepository.replicate,
    ).toHaveBeenCalled();
    expect(
      service._resultImpactLevelRepository.replicate,
    ).not.toHaveBeenCalled();
    expect(
      service._resultImpactPreviousResultRepository.replicate,
    ).not.toHaveBeenCalled();
  });

  it('does not run the type 7 replication for a type 9 result (other branches untouched)', async () => {
    await service.$_phaseChangeReporting(
      { id: 5003, result_code: 100, result_type_id: 9 },
      mockPhase,
      mockUser,
    );

    expect(
      service._resultsInnovationsDevRepository.replicate,
    ).not.toHaveBeenCalled();
    expect(
      service._resultsPolicyChangesRepository.replicate,
    ).not.toHaveBeenCalled();
  });
});
