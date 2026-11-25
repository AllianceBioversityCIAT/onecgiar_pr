import { VersioningService } from './versioning.service';

/**
 * IU26-T-13 / IU26-R-9 (IPSR) — `$_phaseChangeIPSR` stops copying the Step 3 "innovation use" rows
 * (actors, measures, institution types) into a 2026+ phase; a 2025 phase keeps the full copy.
 * Built with `Object.create` (no DI graph), like the impact-replication spec.
 */
describe('VersioningService.$_phaseChangeIPSR — Step 3 use rows (IU26-R-9)', () => {
  const STEP_THREE = [
    '_resultIpResultsActorsRepository',
    '_resultsIpResultMeasuresRespository',
    '_resultsIpInstitutionTypeRepository',
  ];
  const ALWAYS_COPIED = [
    '_resultInnovationPackageRepository',
    '_resultIpActionAreaOutcomeRepository',
    '_resultIpEoiOutcomeRepository',
    '_resultIpIaRepository',
    '_resultIpSdgTargetsRepository',
    '_resultIpExpertRepository',
    '_resultIpMeasureRepository',
    '_resultIpExpertisesRespository',
    '_resultIpExpertWorkshopOrganizedRepostory',
  ];
  const OTHER_REPLICATING = [
    '_resultByInitiativesRepository',
    '_shareResultRequestRepository',
    '_nonPooledProjectRepository',
    '_resultsCenterRepository',
    '_resultByIntitutionsRepository',
    '_resultByInstitutionsByDeliveriesTypeRepository',
    '_resultByIntitutionsTypeRepository',
    '_resultCountryRepository',
    '_resultRegionRepository',
    '_resultCountrySubnationalRepository',
    '_linkedResultRepository',
    '_evidencesRepository',
    '_resultActorRepository',
    '_resultInitiativeBudgetRepository',
    '_resultNonPooledProjectBudgetRepository',
    '_resultInstitutionsBudgetRepository',
  ];

  const user: any = { id: 9 };
  const manager: any = { update: jest.fn().mockResolvedValue({}) };
  const source: any = { id: 5001, result_code: 100, result_type_id: 10 };

  const build = (): any => {
    const svc: any = Object.create(VersioningService.prototype);
    svc._logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    svc.dataSource = { transaction: jest.fn(async (cb: any) => cb(manager)) };
    svc._resultRepository = {
      replicate: jest.fn().mockResolvedValue([{ id: 8001, result_code: 100 }]),
    };
    svc._versionRepository = { findOne: jest.fn().mockResolvedValue(null) };
    for (const field of [
      ...ALWAYS_COPIED,
      ...STEP_THREE,
      ...OTHER_REPLICATING,
    ]) {
      svc[field] = {
        replicate: jest.fn().mockResolvedValue([]),
        ensureMissingBudgetsForPrimaryInitiatives: jest
          .fn()
          .mockResolvedValue(undefined),
      };
    }
    svc._ipsrRespository = {
      replicate: jest
        .fn()
        .mockResolvedValue([{ result_by_innovation_package_id: 77 }]),
      find: jest
        .fn()
        .mockResolvedValue([
          { result_by_innovation_package_id: 66, result_id: 3 },
        ]),
    };
    svc.$_refreshIpsrTitleFromCoreInnovation = jest
      .fn()
      .mockResolvedValue(undefined);
    return svc;
  };

  it.each([2026, 2027])(
    'copies no Step 3 use rows into a %s phase, and everything else still copies',
    async (year) => {
      const svc = build();
      await svc.$_phaseChangeIPSR(
        source,
        { id: 40, phase_name: `Reporting ${year}`, phase_year: year } as any,
        user,
      );
      for (const field of STEP_THREE) {
        expect(svc[field].replicate).not.toHaveBeenCalled();
      }
      for (const field of ALWAYS_COPIED) {
        expect(svc[field].replicate).toHaveBeenCalledTimes(1);
      }
    },
  );

  it('copies the Step 3 use rows into a 2025 phase', async () => {
    const svc = build();
    await svc.$_phaseChangeIPSR(
      source,
      { id: 36, phase_name: 'Reporting 2025', phase_year: 2025 } as any,
      user,
    );
    for (const field of STEP_THREE) {
      expect(svc[field].replicate).toHaveBeenCalledTimes(1);
    }
  });

  it('keeps copying when the phase carries no year', async () => {
    const svc = build();
    await svc.$_phaseChangeIPSR(
      source,
      { id: 36, phase_name: 'Legacy' } as any,
      user,
    );
    for (const field of STEP_THREE) {
      expect(svc[field].replicate).toHaveBeenCalledTimes(1);
    }
  });
});
