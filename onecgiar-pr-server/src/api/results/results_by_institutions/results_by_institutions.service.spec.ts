import { HttpStatus } from '@nestjs/common';
import { In } from 'typeorm';
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { InstitutionRoleEnum } from './entities/institution_role.enum';

describe('ResultsByInstitutionsService', () => {
  let service: ResultsByInstitutionsService;

  const mockDataSource = {
    transaction: jest.fn((fn: any) => fn()),
  };
  const mockResultByInstitutionsRepository = {
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    getResultByInstitutionFull: jest.fn(),
    getResultByInstitutionActorsFull: jest.fn(),
  };
  const mockResultRepository = {
    getResultById: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockDeliveriesTypeRepository = {
    update: jest.fn(),
    save: jest.fn(),
  };
  const mockHandlersError = {
    returnErrorRes: jest.fn((payload) => payload),
  };
  const mockUserRepository = {
    getUserById: jest.fn(),
  };
  const mockResultKnowledgeProductRepository = {
    findOne: jest.fn(),
  };
  const mockResultInstitutionsBudgetRepository = {
    update: jest.fn(),
    save: jest.fn(),
  };
  const mockGlobalParameterRepository = {
    findOne: jest.fn(),
  };
  const mockNonPooledProjectRepository = {
    getAllNPProjectByResultId: jest.fn(),
    updateNPProjectById: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };
  const mockResultsCenterRepository = {
    updateCenter: jest.fn(),
    getAllResultsCenterByResultId: jest.fn(),
    getAllResultsCenterByResultIdAndCenterId: jest.fn(),
    save: jest.fn(),
  };
  const mockNonPooledProjectBudgetRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const mockResultsByProjectsService = {
    syncBilateralProjects: jest.fn(),
  };
  const mockResultsByProjectsRepository = {
    findResultsByProjectsByResultId: jest.fn(),
    find: jest.fn(),
  };
  const mockResultTaggedNotificationService = {
    notifyTaggedCenters: jest.fn().mockResolvedValue(undefined),
    notifyTaggedBilateralProjects: jest.fn().mockResolvedValue(undefined),
  };

  const createService = () =>
    new ResultsByInstitutionsService(
      mockDataSource as any,
      mockResultByInstitutionsRepository as any,
      mockResultRepository as any,
      mockDeliveriesTypeRepository as any,
      mockHandlersError as any,
      mockUserRepository as any,
      mockResultKnowledgeProductRepository as any,
      mockResultInstitutionsBudgetRepository as any,
      mockGlobalParameterRepository as any,
      mockNonPooledProjectRepository as any,
      mockResultsCenterRepository as any,
      mockNonPooledProjectBudgetRepository as any,
      mockResultsByProjectsService as any,
      mockResultsByProjectsRepository as any,
      mockResultTaggedNotificationService as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockResultByInstitutionsRepository.find.mockReset();
    mockResultKnowledgeProductRepository.findOne.mockReset();
    mockResultsByProjectsRepository.findResultsByProjectsByResultId.mockReset();
    service = createService();
  });

  describe('getGetInstitutionsByResultId', () => {
    it('returns the repository payload when records exist', async () => {
      const institutions = [{ id: 1 }];
      mockResultByInstitutionsRepository.getResultByInstitutionFull.mockResolvedValueOnce(
        institutions,
      );

      const response = await service.getGetInstitutionsByResultId(77);

      expect(
        mockResultByInstitutionsRepository.getResultByInstitutionFull,
      ).toHaveBeenCalledWith(77);
      expect(response).toEqual({
        response: institutions,
        message: 'Successful response',
        status: HttpStatus.OK,
      });
    });

    it('returns handler error when repository returns empty list', async () => {
      const handled = { status: 404 };
      mockResultByInstitutionsRepository.getResultByInstitutionFull.mockResolvedValueOnce(
        [],
      );
      mockHandlersError.returnErrorRes.mockReturnValueOnce(handled);

      const response = await service.getGetInstitutionsByResultId(88);

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Institutions Not Found',
        }),
      });
      expect(response).toBe(handled);
    });
  });

  describe('getGetInstitutionsPartnersByResultId', () => {
    const baseResult = {
      id: 99,
      no_applicable_partner: false,
      is_lead_by_partner: false,
      result_type_id: 2,
    };

    it('maps partner institutions, mqap data, and centers', async () => {
      mockResultRepository.getResultById.mockResolvedValueOnce(baseResult);
      mockResultKnowledgeProductRepository.findOne.mockResolvedValueOnce(null);
      mockResultByInstitutionsRepository.find
        .mockResolvedValueOnce([
          {
            id: 1,
            delivery: [
              { id: 10, is_active: true },
              { id: 11, is_active: false },
            ],
            obj_institutions: {
              name: 'Inst 1',
              website_link: 'https://example.org',
              obj_institution_type_code: { code: 'A', name: 'Type A' },
            },
          },
        ])
        .mockResolvedValueOnce([]);
      mockNonPooledProjectRepository.getAllNPProjectByResultId.mockResolvedValueOnce(
        [],
      );
      mockResultsCenterRepository.getAllResultsCenterByResultId.mockResolvedValueOnce(
        [],
      );

      const response = await service.getGetInstitutionsPartnersByResultId(99);

      expect(response).toMatchObject({
        response: expect.objectContaining({
          institutions: [
            expect.objectContaining({
              id: 1,
              delivery: [{ id: 10, is_active: true }],
              obj_institutions: {
                name: 'Inst 1',
                website_link: 'https://example.org',
                obj_institution_type_code: {
                  id: 'A',
                  name: 'Type A',
                },
              },
            }),
          ],
          mqap_institutions: [],
          contributing_center: [],
        }),
        message: 'Successful response',
        status: HttpStatus.OK,
      });
      expect(mockResultByInstitutionsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            result_id: 99,
            institution_roles_id: InstitutionRoleEnum.PARTNER,
          }),
        }),
      );
    });
  });

  describe('getInstitutionsPartnersByResultIdV2', () => {
    const baseResult = {
      id: 42,
      no_applicable_partner: false,
      is_lead_by_partner: false,
      result_type_id: 2,
    };

    it('excludes partners whose Clarisa institution is inactive', async () => {
      mockResultRepository.getResultById.mockResolvedValueOnce(baseResult);
      mockResultKnowledgeProductRepository.findOne.mockResolvedValue(null);
      mockResultByInstitutionsRepository.find.mockResolvedValue([
        {
          id: 1,
          institutions_id: 11585,
          delivery: [{ id: 10, is_active: true }],
          obj_institutions: {
            is_active: false,
            name: 'ARTIS',
            website_link: null,
            obj_institution_type_code: { code: 1, name: 'Type' },
          },
        },
        {
          id: 2,
          institutions_id: 100,
          delivery: [{ id: 11, is_active: true }],
          obj_institutions: {
            is_active: true,
            name: 'Active Partner',
            website_link: null,
            obj_institution_type_code: { code: 2, name: 'Type B' },
          },
        },
      ]);
      mockResultsCenterRepository.getAllResultsCenterByResultId.mockResolvedValue(
        [],
      );
      mockResultsByProjectsRepository.findResultsByProjectsByResultId.mockResolvedValue(
        [],
      );

      const response = await service.getInstitutionsPartnersByResultIdV2(42);
      const payload = response.response as {
        institutions: Array<{ id: number; institutions_id: number }>;
      };

      expect(payload.institutions).toHaveLength(1);
      expect(payload.institutions[0]).toMatchObject({
        id: 2,
        institutions_id: 100,
      });
    });
  });

  describe('handleInstitutions', () => {
    it('soft-deletes deliveries by result_by_institution_id when removing partners', async () => {
      mockResultByInstitutionsRepository.update.mockResolvedValueOnce(
        {} as any,
      );
      mockResultInstitutionsBudgetRepository.update.mockResolvedValueOnce(
        {} as any,
      );
      mockDeliveriesTypeRepository.update.mockResolvedValueOnce({} as any);

      const oldInstitutions = [
        { id: 77, institutions_id: 11585, delivery: [{ id: 900 }] },
      ] as any[];
      const incomingInstitutions = [] as any[];

      await (service as any).handleInstitutions(
        incomingInstitutions,
        oldInstitutions,
        false,
        false,
        42,
        5,
      );

      expect(mockDeliveriesTypeRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          result_by_institution_id: expect.anything(),
        }),
        { is_active: false, last_updated_by: 5 },
      );
      const deliveryWhere =
        mockDeliveriesTypeRepository.update.mock.calls[0][0];
      expect(deliveryWhere.id).toBeUndefined();
    });

    it('reactivates inactive partner without cascading delivery on RBI save', async () => {
      const inactiveRbi = {
        id: 500,
        institutions_id: 11585,
        is_active: false,
        delivery: [{ id: 90553, partner_delivery_type_id: 1, is_active: true }],
      };
      mockResultByInstitutionsRepository.find.mockResolvedValueOnce([
        inactiveRbi,
      ]);
      mockResultByInstitutionsRepository.update.mockResolvedValueOnce(
        {} as any,
      );
      mockResultByInstitutionsRepository.save.mockResolvedValueOnce([]);

      const incomingInstitutions = [
        {
          institutions_id: 11585,
          is_leading_result: false,
          delivery: [{ partner_delivery_type_id: 2 }],
        },
      ] as any[];

      await (service as any).handleInstitutions(
        incomingInstitutions,
        [],
        false,
        false,
        32177,
        5,
      );

      expect(mockResultByInstitutionsRepository.update).toHaveBeenCalledWith(
        { id: 500 },
        expect.objectContaining({ is_active: true, last_updated_by: 5 }),
      );
      expect(mockResultByInstitutionsRepository.save).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 500 })]),
      );
      expect(mockDeliveriesTypeRepository.save).toHaveBeenCalled();
      const savedDeliveries =
        mockDeliveriesTypeRepository.save.mock.calls[0][0] ?? [];
      expect(savedDeliveries[0]?.result_by_institution_id).toBe(500);
    });
  });

  // Night sweep 2026-09-23, D-2 (prtest 12039 / 12040): the review drawer omits centres it could not
  // resolve; with the opt-in an absent key must not reach handleContributingCenters (which unlinks
  // all on []). Control negative: without the preserveCentersWhenAbsent guard the first test fails.
  describe('savePartnersInstitutionsByResultV2 — absent centres (D-2)', () => {
    const arrange = () => {
      (mockResultRepository as any).findOne = jest.fn().mockResolvedValue({
        id: 12039,
        result_type_id: 1,
        result_by_institution_array: [],
      });
      (mockResultRepository as any).update = jest.fn();
      (mockUserRepository as any).getUserById = jest
        .fn()
        .mockResolvedValue({ id: 2 });
      mockGlobalParameterRepository.findOne.mockResolvedValue({ value: '0.5' });
      mockResultKnowledgeProductRepository.findOne.mockResolvedValue(null);
      jest
        .spyOn(service as any, 'handleInstitutions')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'syncInstitutionFromTocFlags')
        .mockResolvedValue(undefined);
      return jest
        .spyOn(service, 'handleContributingCenters')
        .mockResolvedValue(undefined);
    };

    it('leaves the centres alone when the reviewer path omits them', async () => {
      const centers = arrange();
      await service.savePartnersInstitutionsByResultV2(
        { result_id: 12039, institutions: [] } as any,
        { id: 2 } as any,
        { preserveCentersWhenAbsent: true },
      );
      expect(centers).not.toHaveBeenCalled();
    });

    it('keeps the old behaviour (absent -> []) for every other caller', async () => {
      const centers = arrange();
      await service.savePartnersInstitutionsByResultV2(
        { result_id: 12039, institutions: [] } as any,
        { id: 2 } as any,
      );
      expect(centers).toHaveBeenCalledWith(
        [],
        expect.anything(),
        expect.anything(),
      );
    });
  });

  // EPD-T-3 (docs/specs/bugfix/external-partners-duplication): dedupe incoming
  // institutions by institutions_id before create-vs-reactivate logic runs.
  describe('dedupeIncomingInstitutions', () => {
    const dedupe = (institutions: any[]) =>
      (service as any).dedupeIncomingInstitutions(institutions);

    it('is a no-op on already-clean input (no reordering, no drops)', () => {
      const clean = [
        { institutions_id: 1, delivery: [{ partner_delivery_type_id: 1 }] },
        { institutions_id: 2, delivery: [{ partner_delivery_type_id: 2 }] },
        { institutions_id: 3, delivery: [] },
      ];

      expect(dedupe(clean)).toEqual(clean);
    });

    it('returns an empty/undefined input unchanged', () => {
      expect(dedupe([])).toEqual([]);
      expect(dedupe(undefined)).toEqual([]);
    });

    it('collapses duplicate institutions_id entries: prefers the id-bearing entry as base, unions delivery, and prefers from_toc: true', () => {
      const duplicated = [
        {
          id: 800,
          institutions_id: 555,
          from_toc: false,
          delivery: [{ partner_delivery_type_id: 1 }],
        },
        {
          institutions_id: 555,
          from_toc: true,
          delivery: [{ partner_delivery_type_id: 3 }],
        },
        { institutions_id: 999, delivery: [] },
      ];

      const result = dedupe(duplicated);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 800,
        institutions_id: 555,
        from_toc: true,
      });
      expect(result[0].delivery).toEqual([
        { partner_delivery_type_id: 1 },
        { partner_delivery_type_id: 3 },
      ]);
      expect(result[1]).toMatchObject({ institutions_id: 999 });
    });

    it('keeps the first occurrence as base when no duplicate carries an id', () => {
      const duplicated = [
        {
          institutions_id: 555,
          is_leading_result: true,
          delivery: [{ partner_delivery_type_id: 1 }],
        },
        {
          institutions_id: 555,
          is_leading_result: false,
          delivery: [{ partner_delivery_type_id: 2 }],
        },
      ];

      const result = dedupe(duplicated);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        institutions_id: 555,
        is_leading_result: true,
      });
    });
  });

  // EPD-T-3 falsifier: two incoming entries for the same institutions_id (one
  // carrying an existing row's id, one without) must collapse to exactly one
  // active results_by_institution row whose delivery is the union of both.
  describe('savePartnersInstitutionsByResultV2 — duplicate institutions (EPD-T-3)', () => {
    const existingRbi = {
      id: 800,
      result_id: 12345,
      institutions_id: 555,
      institution_roles_id: InstitutionRoleEnum.PARTNER,
      is_active: true,
      delivery: [{ id: 9001, partner_delivery_type_id: 1, is_active: true }],
      result_institution_budget_array: [],
    };

    const arrange = () => {
      (mockResultRepository as any).findOne = jest.fn().mockResolvedValue({
        id: 12345,
        result_type_id: 2, // not an innovation type — no budget branch involved
        result_by_institution_array: [existingRbi],
      });
      (mockResultRepository as any).update = jest.fn();
      (mockUserRepository as any).getUserById = jest
        .fn()
        .mockResolvedValue({ id: 5 });
      mockGlobalParameterRepository.findOne.mockResolvedValue({ value: '0.5' });
      mockResultKnowledgeProductRepository.findOne.mockResolvedValue(null);
      mockResultByInstitutionsRepository.find.mockResolvedValue([]);
      mockResultByInstitutionsRepository.update.mockResolvedValue({});
      mockResultByInstitutionsRepository.save.mockResolvedValue([]);
      mockDeliveriesTypeRepository.update.mockResolvedValue({});
      mockDeliveriesTypeRepository.save.mockResolvedValue([]);
      mockResultsCenterRepository.getAllResultsCenterByResultId.mockResolvedValue(
        [],
      );
      mockResultsByProjectsRepository.findResultsByProjectsByResultId.mockResolvedValue(
        [],
      );
      jest
        .spyOn(service as any, 'syncInstitutionFromTocFlags')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, 'handleContributingCenters')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, 'getInstitutionsPartnersByResultIdV2')
        .mockResolvedValue({ response: {} } as any);
    };

    it('collapses the duplicated payload to exactly one active row with the unioned delivery', async () => {
      arrange();

      await service.savePartnersInstitutionsByResultV2(
        {
          result_id: 12345,
          institutions: [
            {
              id: 800,
              institutions_id: 555,
              delivery: [{ partner_delivery_type_id: 1 }],
            } as any,
            {
              institutions_id: 555,
              delivery: [{ partner_delivery_type_id: 3 }],
            } as any,
          ],
        } as any,
        { id: 5 } as any,
      );

      // No second results_by_institution row is created for institutions_id 555:
      // the only repository.save call for the RBI table is the pre-existing
      // active row (id 800) going through the "toUpdate" path, never a create.
      const rbiSaveCalls = mockResultByInstitutionsRepository.save.mock.calls;
      for (const [savedArg] of rbiSaveCalls) {
        const savedArray = Array.isArray(savedArg) ? savedArg : [savedArg];
        const newRowsForInstitution555 = savedArray.filter(
          (row: any) => row.institutions_id === 555 && row.id == null,
        );
        expect(newRowsForInstitution555).toHaveLength(0);
      }

      // The delivery union (1 and 3) must reach the delivery sync: the pre-existing
      // active delivery (partner_delivery_type_id 1) is left untouched (no removal),
      // and the missing one (3) is added — together the row ends up with both.
      expect(mockDeliveriesTypeRepository.update).not.toHaveBeenCalledWith(
        { id: In([9001]) },
        expect.anything(),
      );
      const savedDeliveries = mockDeliveriesTypeRepository.save.mock.calls
        .flatMap(([saved]) => saved ?? [])
        .map((d: any) => d.partner_delivery_type_id);
      expect(savedDeliveries).toContain(3);
      expect(savedDeliveries).not.toContain(1);

      // Existing active delivery (1) plus newly added (3) == the union {1, 3}.
      const finalDeliverySet = new Set([
        ...existingRbi.delivery
          .filter((d) => d.is_active)
          .map((d) => d.partner_delivery_type_id),
        ...savedDeliveries,
      ]);
      expect(finalDeliverySet).toEqual(new Set([1, 3]));
    });

    it('is a no-op on a clean (non-duplicated) payload — does not drop the single legitimate entry', async () => {
      arrange();

      await service.savePartnersInstitutionsByResultV2(
        {
          result_id: 12345,
          institutions: [
            {
              id: 800,
              institutions_id: 555,
              delivery: [{ partner_delivery_type_id: 1 }],
            } as any,
          ],
        } as any,
        { id: 5 } as any,
      );

      // The single legitimate entry must still resolve to the existing row
      // (no new row created, no data dropped).
      const rbiSaveCalls = mockResultByInstitutionsRepository.save.mock.calls;
      for (const [savedArg] of rbiSaveCalls) {
        const savedArray = Array.isArray(savedArg) ? savedArg : [savedArg];
        expect(
          savedArray.filter(
            (row: any) => row.institutions_id === 555 && row.id == null,
          ),
        ).toHaveLength(0);
      }
    });
  });

  // EPD-T-5 (docs/specs/bugfix/external-partners-duplication, EPD-AC-5): end-to-end
  // regression for the ORIGINAL repro shape reported on IPSR result 9657 — 6 distinct
  // institutions, each one sent TWICE in the save payload (once as it would arrive from the
  // ToC bucket, once from "Other(s)"), on an INNOVATION result type so a save also creates a
  // `result_institutions_budget` row per partner — the exact table whose NOT NULL constraint
  // surfaced the bug. Deliberately distinct from the narrower `EPD-T-3` tests above (a single
  // duplicated institution, non-innovation type): this is the mandatory Bug Mode regression
  // tying the fix to the reported symptom end-to-end (institution rows AND budget rows).
  describe('savePartnersInstitutionsByResultV2 — original repro: 6 institutions doubled, innovation type (EPD-T-5)', () => {
    const institutionIds = [901, 902, 903, 904, 905, 906];

    const arrange = () => {
      (mockResultRepository as any).findOne = jest.fn().mockResolvedValue({
        id: 9657,
        result_type_id: 7, // ResultTypeEnum.INNOVATION_DEVELOPMENT — triggers the budget-row branch
        result_by_institution_array: [],
      });
      (mockResultRepository as any).update = jest.fn();
      (mockUserRepository as any).getUserById = jest
        .fn()
        .mockResolvedValue({ id: 5 });
      mockGlobalParameterRepository.findOne.mockResolvedValue({ value: '0.5' });
      mockResultKnowledgeProductRepository.findOne.mockResolvedValue(null);
      // No pre-existing rows for any of the 6 institutions — every one must be a fresh create.
      mockResultByInstitutionsRepository.find.mockResolvedValue([]);
      mockResultByInstitutionsRepository.update.mockResolvedValue({});
      mockResultByInstitutionsRepository.save.mockImplementation(
        (toCreate: any[]) =>
          Promise.resolve(
            toCreate.map((institution, index) => ({
              ...institution,
              id: 1000 + index,
            })),
          ),
      );
      mockResultInstitutionsBudgetRepository.save.mockResolvedValue([]);
      mockDeliveriesTypeRepository.update.mockResolvedValue({});
      mockDeliveriesTypeRepository.save.mockResolvedValue([]);
      mockResultsCenterRepository.getAllResultsCenterByResultId.mockResolvedValue(
        [],
      );
      mockResultsByProjectsRepository.findResultsByProjectsByResultId.mockResolvedValue(
        [],
      );
      jest
        .spyOn(service as any, 'syncInstitutionFromTocFlags')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, 'handleContributingCenters')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service, 'getInstitutionsPartnersByResultIdV2')
        .mockResolvedValue({ response: {} } as any);
    };

    it('EPD-AC-5 falsifier: 6 institutions sent twice (ToC + Other, 12 entries) collapse to exactly 6 created rows and 6 budget rows — save succeeds without a constraint error', async () => {
      arrange();

      const institutions = institutionIds.flatMap((id) => [
        {
          institutions_id: id,
          from_toc: true,
          delivery: [{ partner_delivery_type_id: 1 }],
        } as any,
        {
          institutions_id: id,
          from_toc: false,
          delivery: [{ partner_delivery_type_id: 2 }],
        } as any,
      ]);

      const result = await service.savePartnersInstitutionsByResultV2(
        { result_id: 9657, institutions } as any,
        { id: 5 } as any,
      );

      // The save must succeed — no constraint error thrown, no error envelope returned.
      expect(result).toBeDefined();
      expect((result as any)?.status).toBe(HttpStatus.OK);

      // Across every `_resultByIntitutionsRepository.save(...)` call this method makes (the
      // create-array call and the unconditional `toUpdate` call, which is empty here since there
      // are no pre-existing rows), exactly 6 NEW institution rows must be created — not 12.
      const allSavedInstitutions =
        mockResultByInstitutionsRepository.save.mock.calls.flatMap(
          ([saved]) => saved ?? [],
        );
      const newInstitutionRows = allSavedInstitutions.filter(
        (row: any) => row?.id == null,
      );
      expect(newInstitutionRows).toHaveLength(6);
      expect(
        newInstitutionRows
          .map((i: any) => i.institutions_id)
          .sort((a: number, b: number) => a - b),
      ).toEqual(institutionIds);

      // Exactly 6 budget rows are created (one per institution) — pre-fix, 12 institution rows
      // would each get their own budget row, doubling the writes this table receives. Every
      // `_resultInstitutionsBudgetRepository.save(...)` call is summed the same way (the
      // `updatedNewBudgets` call is empty here since `toUpdate` is empty).
      const allSavedBudgets =
        mockResultInstitutionsBudgetRepository.save.mock.calls.flatMap(
          ([saved]) => saved ?? [],
        );
      expect(allSavedBudgets).toHaveLength(6);
    });
  });

  // EPD-T-4 (docs/specs/bugfix/external-partners-duplication, EPD-DD-3): a
  // known DB constraint failure (NOT NULL / FK) must be translated into a
  // plain-language message instead of the raw driver string reaching the
  // client, while any other error keeps the existing returnErrorRes path.
  describe('savePartnersInstitutionsByResultV2 — constraint failure translation (EPD-T-4)', () => {
    const arrange = () => {
      (mockResultRepository as any).findOne = jest.fn();
      (mockUserRepository as any).getUserById = jest.fn();
    };

    it('translates a NOT NULL (errno 1048) QueryFailedError-shaped error into a plain message, logs the original, and returns 400', async () => {
      arrange();
      const driverError = new Error(
        "Column 'result_institution_id' cannot be null",
      ) as any;
      driverError.driverError = { errno: 1048, code: 'ER_BAD_NULL_ERROR' };
      mockDataSource.transaction.mockImplementationOnce(() => {
        throw driverError;
      });
      const loggerSpy = jest.spyOn((service as any)._logger, 'error');

      let thrown: any;
      try {
        await service.savePartnersInstitutionsByResultV2(
          { result_id: 4242, institutions: [] } as any,
          { id: 5 } as any,
        );
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeDefined();
      expect(thrown.status).toBe(HttpStatus.BAD_REQUEST);
      expect(thrown.message).not.toEqual(expect.stringContaining('Column'));
      expect(thrown.message).not.toEqual(
        expect.stringContaining('cannot be null'),
      );

      expect(loggerSpy).toHaveBeenCalled();
      const loggedMessage = loggerSpy.mock.calls[0][0] as string;
      expect(loggedMessage).toEqual(
        expect.stringContaining(
          "Column 'result_institution_id' cannot be null",
        ),
      );
      expect(loggedMessage).toEqual(expect.stringContaining('4242'));
    });

    it('translates an FK violation (errno 1452) the same way', async () => {
      arrange();
      const driverError = new Error(
        'Cannot add or update a child row: a foreign key constraint fails',
      ) as any;
      driverError.driverError = {
        errno: 1452,
        code: 'ER_NO_REFERENCED_ROW_2',
      };
      mockDataSource.transaction.mockImplementationOnce(() => {
        throw driverError;
      });

      await expect(
        service.savePartnersInstitutionsByResultV2(
          { result_id: 4343, institutions: [] } as any,
          { id: 5 } as any,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        message: expect.not.stringContaining('foreign key'),
      });
    });

    it('does NOT swallow an unrelated, already-specific error (Result Not Found) — keeps the existing returnErrorRes path', async () => {
      arrange();
      (mockResultRepository as any).findOne.mockResolvedValue(null);
      mockHandlersError.returnErrorRes.mockImplementationOnce(
        (payload: any) => payload,
      );

      const response = await service.savePartnersInstitutionsByResultV2(
        { result_id: 5151, institutions: [] } as any,
        { id: 5 } as any,
      );

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'Result Not Found' }),
          debug: true,
        }),
      );
      expect((response as any).error.message).toBe('Result Not Found');
    });

    it('does NOT swallow an unrelated, already-specific error (User Not Found) — keeps the existing returnErrorRes path', async () => {
      arrange();
      (mockResultRepository as any).findOne.mockResolvedValue({
        id: 5151,
        result_type_id: 1,
        result_by_institution_array: [],
      });
      (mockUserRepository as any).getUserById.mockResolvedValue(null);
      mockHandlersError.returnErrorRes.mockImplementationOnce(
        (payload: any) => payload,
      );

      const response = await service.savePartnersInstitutionsByResultV2(
        { result_id: 5151, institutions: [] } as any,
        { id: 5 } as any,
      );

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'User Not Found' }),
          debug: true,
        }),
      );
      expect((response as any).error.message).toBe('User Not Found');
    });
  });

  describe('handleContributingCenters', () => {
    const baseUser = { id: 5 } as any;
    const baseDto = { result_id: 123 };

    it('creates or updates centers and syncs the association list', async () => {
      mockResultsCenterRepository.getAllResultsCenterByResultIdAndCenterId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ center_id: 'IITA', is_leading_result: false });

      await service.handleContributingCenters(
        [
          { code: 'CIM', is_leading_result: true } as any,
          { code: 'IITA', is_leading_result: false } as any,
        ],
        baseDto,
        baseUser,
      );

      expect(mockResultsCenterRepository.updateCenter).toHaveBeenCalledWith(
        123,
        ['CIM', 'IITA'],
        baseUser.id,
      );

      const savedPayload =
        mockResultsCenterRepository.save.mock.calls[0][0] ?? [];
      expect(savedPayload).toHaveLength(2);
      expect(savedPayload[0]).toMatchObject({
        center_id: 'CIM',
        result_id: 123,
        is_leading_result: true,
      });
      expect(savedPayload[1]).toMatchObject({
        center_id: 'IITA',
        is_leading_result: false,
        last_updated_by: baseUser.id,
      });
    });

    // P2-3214. The notification must fire only for centres that were not linked before, which is
    // exactly the `else` branch of the upsert above. Without this, every partners save would
    // re-notify the whole centre.
    describe('tagged-centre notifications (P2-3214)', () => {
      it('notifies only the centres that were newly linked', async () => {
        mockResultsCenterRepository.getAllResultsCenterByResultIdAndCenterId
          .mockResolvedValueOnce(null) // CIM is new
          .mockResolvedValueOnce({ center_id: 'IITA' }); // IITA was already linked

        await service.handleContributingCenters(
          [
            { code: 'CIM', is_leading_result: true } as any,
            { code: 'IITA', is_leading_result: false } as any,
          ],
          baseDto,
          baseUser,
        );

        expect(
          mockResultTaggedNotificationService.notifyTaggedCenters,
        ).toHaveBeenCalledWith(123, baseUser.id, ['CIM']);
      });

      it('does not notify when every centre was already linked', async () => {
        mockResultsCenterRepository.getAllResultsCenterByResultIdAndCenterId.mockResolvedValue(
          { center_id: 'IITA' },
        );

        await service.handleContributingCenters(
          [{ code: 'IITA', is_leading_result: false } as any],
          baseDto,
          baseUser,
        );

        expect(
          mockResultTaggedNotificationService.notifyTaggedCenters,
        ).not.toHaveBeenCalled();
      });

      it('does not notify when the payload clears the centres', async () => {
        await service.handleContributingCenters([], baseDto, baseUser);

        expect(
          mockResultTaggedNotificationService.notifyTaggedCenters,
        ).not.toHaveBeenCalled();
      });

      it('still saves the centres when the notification blows up', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        mockResultsCenterRepository.getAllResultsCenterByResultIdAndCenterId.mockResolvedValueOnce(
          null,
        );
        mockResultTaggedNotificationService.notifyTaggedCenters.mockRejectedValueOnce(
          new Error('socket down'),
        );

        await expect(
          service.handleContributingCenters(
            [{ code: 'CIM', is_leading_result: true } as any],
            baseDto,
            baseUser,
          ),
        ).resolves.not.toThrow();

        expect(mockResultsCenterRepository.save).toHaveBeenCalled();
      });
    });

    it('clears centers when an empty payload is provided', async () => {
      await service.handleContributingCenters([], baseDto, baseUser);

      expect(mockResultsCenterRepository.updateCenter).toHaveBeenCalledWith(
        123,
        [],
        baseUser.id,
      );
      expect(mockResultsCenterRepository.save).not.toHaveBeenCalled();
    });
  });
});
