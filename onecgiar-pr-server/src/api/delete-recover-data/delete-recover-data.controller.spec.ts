import { Test, TestingModule } from '@nestjs/testing';
import { DeleteRecoverDataController } from './delete-recover-data.controller';
import { DeleteRecoverDataService } from './delete-recover-data.service';

describe('DeleteRecoverDataController', () => {
  let controller: DeleteRecoverDataController;

  const mockService = {
    deleteResult: jest.fn().mockResolvedValue({ statusCode: 200, response: {} }),
    changeResultType: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: { updated: true } }),
  } as unknown as jest.Mocked<DeleteRecoverDataService>;

  const user = { id: 1 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeleteRecoverDataController],
      providers: [{ provide: DeleteRecoverDataService, useValue: mockService }],
    }).compile();

    controller = module.get(DeleteRecoverDataController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deleteResult delegates to service with parsed id and user', async () => {
    const res = await controller.deleteResult('12', user);
    expect(mockService.deleteResult).toHaveBeenCalledWith(12, user);
    expect(res.statusCode).toBe(200);
  });

  it('changeResultType delegates with parsed numbers and fields', async () => {
    const dto = {
      result_level_id: '3',
      result_type_id: '7',
      justification: 'because',
      new_name: 'New Title',
    } as any;

    const res = await controller.changeResultType('5', user, dto);
    expect(mockService.changeResultType).toHaveBeenCalledWith(
      5,
      3,
      7,
      'because',
      user,
      true,
      'New Title',
    );
    expect(res.statusCode).toBe(200);
  });
});

