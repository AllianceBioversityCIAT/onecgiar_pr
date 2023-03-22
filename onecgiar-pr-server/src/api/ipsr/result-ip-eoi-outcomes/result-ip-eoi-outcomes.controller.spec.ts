import { Test, TestingModule } from '@nestjs/testing';
import { ResultIpEoiOutcomesController } from './result-ip-eoi-outcomes.controller';
import { ResultIpEoiOutcomesService } from './result-ip-eoi-outcomes.service';

describe('ResultIpEoiOutcomesController', () => {
  let controller: ResultIpEoiOutcomesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultIpEoiOutcomesController],
      providers: [ResultIpEoiOutcomesService],
    }).compile();

    controller = module.get<ResultIpEoiOutcomesController>(ResultIpEoiOutcomesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
