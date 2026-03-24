import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByInstitutionsController } from './results_by_institutions.controller';
import { ResultsByInstitutionsService } from './results_by_institutions.service';

describe('ResultsByInstitutionsController', () => {
  let controller: ResultsByInstitutionsController;
  const mockService = {
    create: jest.fn(),
    getGetInstitutionsByResultId: jest.fn(),
    getGetInstitutionsActorsByResultId: jest.fn(),
    getGetInstitutionsPartnersByResultId: jest.fn(),
    savePartnersInstitutionsByResult: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsByInstitutionsController],
      providers: [
        {
          provide: ResultsByInstitutionsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ResultsByInstitutionsController>(
      ResultsByInstitutionsController,
    );
  });

  it('delegates create calls to the service', () => {
    const dto = { foo: 'bar' } as any;
    controller.create(dto);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('fetches institutions by result id', () => {
    controller.findAll(5);
    expect(mockService.getGetInstitutionsByResultId).toHaveBeenCalledWith(5);
  });

  it('fetches actors for a result', () => {
    controller.findAllByActors(8);
    expect(mockService.getGetInstitutionsActorsByResultId).toHaveBeenCalledWith(
      8,
    );
  });

  it('fetches partners for a result', () => {
    controller.findAllByPartners(11);
    expect(
      mockService.getGetInstitutionsPartnersByResultId,
    ).toHaveBeenCalledWith(11);
  });

  it('saves partner information and injects the result id into the payload', () => {
    const dto: any = {};
    const user: any = { id: 1 };
    controller.findOne(dto, user, 33);

    expect(dto.result_id).toBe(33);
    expect(mockService.savePartnersInstitutionsByResult).toHaveBeenCalledWith(
      dto,
      user,
    );
  });
});
