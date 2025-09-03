import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';

import { IpsrController } from './ipsr.controller';
import { IpsrService } from './ipsr.service';

describe('IpsrController', () => {
  let controller: IpsrController;

  const mockService = {
    findAllInnovations: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: [] }),
    findOneInnovation: jest
      .fn()
      .mockResolvedValue({ status: 200, response: {} }),
    allInnovationPackages: jest
      .fn()
      .mockResolvedValue({ status: 200, response: [] }),
    findInnovationDetail: jest
      .fn()
      .mockResolvedValue({ status: 200, response: {} }),
    getIpsrList: jest
      .fn()
      .mockResolvedValue({ status: 200, message: 'ok', response: [{ id: 1 }] }),
  } as unknown as jest.Mocked<IpsrService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpsrController],
      providers: [{ provide: IpsrService, useValue: mockService }],
    }).compile();

    controller = module.get(IpsrController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to service.findAllInnovations', async () => {
    const res = await controller.findAll([1, 2] as any);
    expect(mockService.findAllInnovations).toHaveBeenCalledWith([1, 2]);
    expect(res.statusCode).toBe(200);
  });

  it('findOne delegates to service.findOneInnovation', async () => {
    const res = await controller.findOne(5);
    expect(mockService.findOneInnovation).toHaveBeenCalledWith(5);
    expect(res.status).toBe(200);
  });

  it('allInnovationPackages delegates to service with user', async () => {
    const user = { id: 7 } as any;
    const res = await controller.allInnovationPackages(user);
    expect(mockService.allInnovationPackages).toHaveBeenCalledWith(user);
    expect(res.status).toBe(200);
  });

  it('findInnovationDetail delegates to service', async () => {
    const res = await controller.findInnovationDetail(9);
    expect(mockService.findInnovationDetail).toHaveBeenCalledWith(9);
    expect(res.status).toBe(200);
  });

  it('getIpsrList throws HttpException with service payload', async () => {
    await expect(controller.getIpsrList({} as any)).rejects.toThrow(
      HttpException,
    );
    try {
      await controller.getIpsrList({} as any);
    } catch (e) {
      const err = e as HttpException;
      expect(err.getStatus()).toBe(200);
      expect(err.getResponse()).toEqual({
        message: 'ok',
        response: [{ id: 1 }],
      });
    }
  });
});
