import { Test, TestingModule } from '@nestjs/testing';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';

describe('SummaryController', () => {
  let controller: SummaryController;
  let mockSummaryService: any;

  const user = { id: 3 } as any;

  beforeEach(async () => {
    mockSummaryService = {
      saveInnovationUse: jest.fn().mockResolvedValue({ ok: true }),
      getInnovationUse: jest.fn().mockResolvedValue({ ok: true }),
      saveCapacityDevelopents: jest.fn().mockResolvedValue({ ok: true }),
      getCapacityDevelopents: jest.fn().mockResolvedValue({ ok: true }),
      saveInnovationDev: jest.fn().mockResolvedValue({ ok: true }),
      getInnovationDev: jest.fn().mockResolvedValue({ ok: true }),
      savePolicyChanges: jest.fn().mockResolvedValue({ ok: true }),
      getPolicyChanges: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SummaryController],
      providers: [{ provide: SummaryService, useValue: mockSummaryService }],
    }).compile();

    controller = module.get(SummaryController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates saveInnovationUse', async () => {
    const dto = { foo: 'bar' } as any;
    await controller.saveInnovationUse(5 as any, dto, user);
    expect(mockSummaryService.saveInnovationUse).toHaveBeenCalledWith(
      dto,
      5,
      user,
    );
  });

  it('delegates getInnovationUse', async () => {
    await controller.getInnovationUse(7 as any);
    expect(mockSummaryService.getInnovationUse).toHaveBeenCalledWith(7);
  });

  it('delegates saveCapacityDevelopents', async () => {
    const dto = { a: 1 } as any;
    await controller.saveCapacityDevelopents(9 as any, dto, user);
    expect(mockSummaryService.saveCapacityDevelopents).toHaveBeenCalledWith(
      dto,
      9,
      user,
    );
  });

  it('delegates getCapacityDevelopents', async () => {
    await controller.getCapacityDevelopents(2 as any);
    expect(mockSummaryService.getCapacityDevelopents).toHaveBeenCalledWith(2);
  });

  it('delegates saveInnovationDev', async () => {
    const innovationDto = { title: 'short' } as any;
    const innovationUseDto = { extra: true } as any;

    await controller.saveInnovationDev(
      4 as any,
      innovationDto,
      innovationUseDto,
      user,
    );

    expect(mockSummaryService.saveInnovationDev).toHaveBeenCalledWith(
      innovationDto,
      innovationUseDto,
      4,
      user,
    );
  });

  it('delegates getInnovationDev', async () => {
    await controller.getInnovationDev(6 as any);
    expect(mockSummaryService.getInnovationDev).toHaveBeenCalledWith(6);
  });

  it('delegates savePolicyChanges', async () => {
    const dto = { amount: 1 } as any;
    await controller.savePolicyChanges(11 as any, dto, user);
    expect(mockSummaryService.savePolicyChanges).toHaveBeenCalledWith(
      dto,
      11,
      user,
    );
  });

  it('delegates getPolicyChanges', async () => {
    await controller.getPolicyChanges(12 as any);
    expect(mockSummaryService.getPolicyChanges).toHaveBeenCalledWith(12);
  });
});
