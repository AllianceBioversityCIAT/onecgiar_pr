import { Test, TestingModule } from '@nestjs/testing';
import { GlobalParameterController } from './global-parameter.controller';
import { GlobalParameterService } from './global-parameter.service';

describe('GlobalParameterController', () => {
  let controller: GlobalParameterController;

  const mockService = {
    findAll: jest.fn().mockResolvedValue({ statusCode: 200, response: [] }),
    findByCategoryId: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: [] }),
    getPlatformGlobalVariables: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: {} }),
    findOneByName: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: {} }),
    updateGlobalParameter: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: { updated: true } }),
  } as unknown as jest.Mocked<GlobalParameterService>;

  const user = { id: 1 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalParameterController],
      providers: [{ provide: GlobalParameterService, useValue: mockService }],
    }).compile();

    controller = module.get(GlobalParameterController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to service', async () => {
    const res = await controller.findAll();
    expect(mockService.findAll).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('findByCategoryId parses and delegates', async () => {
    const res = await controller.findByCategoryId('5');
    expect(mockService.findByCategoryId).toHaveBeenCalledWith(5);
    expect(res.statusCode).toBe(200);
  });

  it('getPlatformGlobalVariables delegates', async () => {
    const res = await controller.getPlatformGlobalVariables();
    expect(mockService.getPlatformGlobalVariables).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('findByName delegates with name', async () => {
    const res = await controller.findByName('FLAG');
    expect(mockService.findOneByName).toHaveBeenCalledWith('FLAG');
    expect(res.statusCode).toBe(200);
  });

  it('updateVariable delegates with dto and user', async () => {
    const dto = { name: 'A', value: '1' } as any;
    const res = await controller.updateVariable(dto, user);
    expect(mockService.updateGlobalParameter).toHaveBeenCalledWith(dto, user);
    expect(res.statusCode).toBe(200);
  });
});
