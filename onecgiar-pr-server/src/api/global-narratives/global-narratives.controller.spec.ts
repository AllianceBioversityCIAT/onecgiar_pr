import { Test, TestingModule } from '@nestjs/testing';
import { GlobalNarrativesController } from './global-narratives.controller';
import { GlobalNarrativesService } from './global-narratives.service';

describe('GlobalNarrativesController', () => {
  let controller: GlobalNarrativesController;

  const mockService = {
    findOneById: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: { id: 1 } }),
    findOneByName: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: { name: 'X' } }),
  } as unknown as jest.Mocked<GlobalNarrativesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalNarrativesController],
      providers: [{ provide: GlobalNarrativesService, useValue: mockService }],
    }).compile();

    controller = module.get(GlobalNarrativesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findOneById parses id and delegates to service', async () => {
    const res = await controller.findOneById('7');
    expect(mockService.findOneById).toHaveBeenCalledWith(7);
    expect(res.statusCode).toBe(200);
  });

  it('findOneByName delegates with name', async () => {
    const res = await controller.findOneByName('abc');
    expect(mockService.findOneByName).toHaveBeenCalledWith('abc');
    expect(res.statusCode).toBe(200);
  });
});
