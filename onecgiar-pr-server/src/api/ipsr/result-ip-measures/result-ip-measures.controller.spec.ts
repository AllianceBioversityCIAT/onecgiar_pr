import { Test, TestingModule } from '@nestjs/testing';
import { ResultIpMeasuresController } from './result-ip-measures.controller';
import { ResultIpMeasuresService } from './result-ip-measures.service';

describe('ResultIpMeasuresController', () => {
  let controller: ResultIpMeasuresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultIpMeasuresController],
      providers: [ResultIpMeasuresService],
    }).compile();

    controller = module.get<ResultIpMeasuresController>(
      ResultIpMeasuresController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
