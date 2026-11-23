import { InnovationUseService } from './innovation-use.service';

/**
 * P2-4129 — the explanation / scaling answer / study links gate on the LEVEL NUMBER, never on the
 * catalogue row id. Test and prod catalogues repeat levels under higher ids (e.g. row 13 = level 2),
 * so a gate that compares the id keeps the explanation on a level-2 result.
 *
 * Fixtures deliberately model id != level: 13->2, 6->5, 5->4, 7->6.
 *   save: explanation + answer kept at level >= 5; study URLs synced only at level >= 6
 *         (below 6 they are deactivated); a NULL level clears everything.
 *   read: study URLs returned only when the stored row's level number is >= 6.
 *
 * Specs: ULT-R-1, ULT-R-2, ULT-R-3, ULT-NFR-3 (docs/specs/bugfix/p2-4129-innovation-use-level-threshold).
 * Built off the prototype, same shape as `innovation-use.service.use-level.spec.ts`.
 */
describe('InnovationUseService — level thresholds on the level number (P2-4129)', () => {
  const USER = { id: 7 } as any;
  const RESULT_ID = 41;
  const EXPLANATION = 'because the evidence says so';
  const URLS = ['https://study.example/a'];

  type Branch = 'existing' | 'new' | 'duplicate-retry';
  const BRANCHES: Branch[] = ['existing', 'new', 'duplicate-retry'];

  function makeService(branch: Branch, levelRow: any) {
    const service: any = Object.create(InnovationUseService.prototype);
    service.logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };

    const stored = { result_innovation_use_id: 9, results_id: RESULT_ID };
    const save = jest.fn().mockImplementation((row: any) => {
      // A brand-new row gets its id from the DB on insert.
      row.result_innovation_use_id ??= 9;
      return Promise.resolve(row);
    });
    const findOne = jest.fn();

    if (branch === 'existing') {
      findOne.mockResolvedValue({ ...stored });
    } else if (branch === 'new') {
      findOne.mockResolvedValue(null);
    } else {
      // First lookup: nothing. First save: the concurrent request won the insert.
      // Retry lookup: the row exists now.
      findOne.mockResolvedValueOnce(null).mockResolvedValue({ ...stored });
      save.mockRejectedValueOnce({ driverError: { code: 'ER_DUP_ENTRY' } });
    }

    service._resultsInnovationsUseRepository = {
      findOne,
      InnovUseExists: jest.fn().mockResolvedValue(null),
      save,
    };
    service._clarisaInnovationUseLevelRepository = {
      findOne: jest.fn().mockResolvedValue(levelRow),
    };
    service._resultRepository = { update: jest.fn() };
    // Rethrows on purpose: a silent collaborator gap would otherwise leave `save` empty and pass.
    service._handlersError = {
      returnErrorRes: jest.fn().mockImplementation(({ error }) => {
        throw error;
      }),
    };
    service._resultScalingStudyUrlsRepository = {
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    service._resultsInvestmentDiscontinuedOptionRepository = {
      inactiveData: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };
    service._linkedResultService = {
      createForInnovationUse: jest.fn().mockResolvedValue(undefined),
    };
    service.syncBudgetForResults = jest.fn().mockResolvedValue(undefined);
    service.saveInitiativeInvestment = jest.fn().mockResolvedValue(undefined);
    service.saveBillateralInvestment = jest.fn().mockResolvedValue(undefined);
    service.savePartnerInvestment = jest.fn().mockResolvedValue(undefined);
    service.saveAnticipatedInnoUser = jest.fn().mockResolvedValue(undefined);
    service.syncScalingStudyUrls = jest.fn().mockResolvedValue(undefined);
    return service;
  }

  /** The row the winning `save` call persisted (the last one: the retry saves twice). */
  const savedRow = (service: any) =>
    service._resultsInnovationsUseRepository.save.mock.calls.at(-1)?.[0];

  const dto = (over: any = {}) =>
    ({
      has_innovation_link: false,
      innovation_use_level_id: 1, // the level number the client sends; the stub decides the row
      readiness_level_explanation: EXPLANATION,
      has_scaling_studies: true,
      scaling_studies_urls: URLS,
      ...over,
    }) as any;

  describe.each(BRANCHES)('save — %s branch', (branch) => {
    it.each([
      ['row 13 / level 2 (the defect)', { id: 13, level: 2 }, false, false],
      ['row 6 / level 5', { id: 6, level: 5 }, true, false],
      ['row 5 / level 4', { id: 5, level: 4 }, false, false],
      ['row 7 / level 6', { id: 7, level: 6 }, true, true],
      ['row 9 / level "5" as a string', { id: 9, level: '5' }, true, false],
    ])(
      'level from %s: explanation+answer kept=%s, URLs synced=%s',
      async (_label, levelRow, keepsExplanation, syncsUrls) => {
        const service = makeService(branch, levelRow);

        await service.saveInnovationUse(dto(), RESULT_ID, USER);

        if (branch === 'duplicate-retry') {
          // Without this the retry code never ran and the case proves nothing about that branch.
          expect(
            service._resultsInnovationsUseRepository.save,
          ).toHaveBeenCalledTimes(2);
          expect(service.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Duplicate entry'),
          );
        }

        const row = savedRow(service);
        // ULT-R-3: the stored value is still the catalogue ROW ID.
        expect(row.innovation_use_level_id).toBe(levelRow.id);

        if (keepsExplanation) {
          expect(row.readiness_level_explanation).toBe(EXPLANATION);
          expect(row.has_scaling_studies).toBe(true);
        } else {
          expect(row.readiness_level_explanation ?? null).toBeNull();
          expect(row.has_scaling_studies ?? false).toBe(false);
        }

        if (syncsUrls) {
          expect(service.syncScalingStudyUrls).toHaveBeenCalledWith(
            9,
            URLS,
            USER.id,
          );
        } else {
          expect(service.syncScalingStudyUrls).not.toHaveBeenCalled();
        }
      },
    );

    it('no level (NULL): explanation and answer cleared, no URL sync, catalogue untouched', async () => {
      const service = makeService(branch, { id: 13, level: 2 });

      await service.saveInnovationUse(
        dto({ innovation_use_level_id: null }),
        RESULT_ID,
        USER,
      );

      const row = savedRow(service);
      expect(row.innovation_use_level_id).toBeNull();
      expect(row.readiness_level_explanation ?? null).toBeNull();
      expect(row.has_scaling_studies ?? false).toBe(false);
      expect(service.syncScalingStudyUrls).not.toHaveBeenCalled();
      expect(
        service._clarisaInnovationUseLevelRepository.findOne,
      ).not.toHaveBeenCalled();
    });
  });

  describe('save — level 5 deactivates links but keeps the answer (ULT-R-2)', () => {
    it.each(['existing', 'duplicate-retry'] as Branch[])(
      '%s branch: URLs deactivated, has_scaling_studies kept true',
      async (branch) => {
        const service = makeService(branch, { id: 6, level: 5 });

        await service.saveInnovationUse(dto(), RESULT_ID, USER);

        expect(
          service._resultScalingStudyUrlsRepository.update,
        ).toHaveBeenCalledWith(
          { result_innov_use_id: 9 },
          { is_active: false },
        );
        expect(savedRow(service).has_scaling_studies).toBe(true);
      },
    );
  });

  describe('read — getInnovationUse study links (ULT-R-2)', () => {
    function makeReader(innovUseRow: any) {
      const service: any = Object.create(InnovationUseService.prototype);
      service.logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
      service._resultsInnovationsUseRepository = {
        InnovUseExists: jest.fn().mockResolvedValue(innovUseRow),
        getLinkedResultsByOrigin: jest.fn().mockResolvedValue([]),
      };
      service._resultsInvestmentDiscontinuedOptionRepository = {
        find: jest.fn().mockResolvedValue([]),
      };
      service._resultScalingStudyUrlsRepository = {
        find: jest
          .fn()
          .mockResolvedValue([{ study_url: 'https://study.example/a' }]),
      };
      service.getActorsData = jest.fn().mockResolvedValue([]);
      service.getMeasuresData = jest.fn().mockResolvedValue([]);
      service.getOrganizationsData = jest.fn().mockResolvedValue([]);
      service.getPreviousPhase2030Projection = jest
        .fn()
        .mockResolvedValue(null);
      service.getPreviousPhaseCurrentUse = jest.fn().mockResolvedValue(null);
      service.getInvestmentPrograms = jest.fn().mockResolvedValue([]);
      service.getInvestmentBilateral = jest.fn().mockResolvedValue([]);
      service.getInvestmentPartners = jest.fn().mockResolvedValue([]);
      service._handlersError = {
        returnErrorRes: jest.fn().mockImplementation(({ error }) => {
          throw error;
        }),
      };
      return service;
    }

    it.each([
      ['row 13 / level 2 (the defect)', 13, 2, []],
      ['row 5 / level 4', 5, 4, []],
      ['row 5 / level 6', 5, 6, ['https://study.example/a']],
      ['row 7 / level "6" as a string', 7, '6', ['https://study.example/a']],
      ['row 13 / level NULL', 13, null, []],
    ])('%s', async (_label, id, level, expected) => {
      const service = makeReader({
        result_innovation_use_id: 9,
        innovation_use_level_id: id,
        level,
      });

      const res = await service.getInnovationUse(RESULT_ID);

      expect(res.response.scaling_studies_urls).toEqual(expected);
    });
  });
});
