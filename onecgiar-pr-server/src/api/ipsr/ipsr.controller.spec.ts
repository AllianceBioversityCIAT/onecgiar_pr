import { Test, TestingModule } from '@nestjs/testing';
import { IpsrController } from './ipsr.controller';
import { IpsrService } from './ipsr.service';

describe('IpsrController', () => {
  let controller: IpsrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpsrController],
      providers: [IpsrService],
    }).compile();

    controller = module.get<IpsrController>(IpsrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
