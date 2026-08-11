import { HttpStatus } from '@nestjs/common';
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
