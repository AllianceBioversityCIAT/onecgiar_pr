import { Test, TestingModule } from '@nestjs/testing';
import { YearsController } from './years.controller';
import { YearsService } from './years.service';

describe('YearsController', () => {
  let controller: YearsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YearsController],
      providers: [YearsService],
    }).compile();

    controller = module.get<YearsController>(YearsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
