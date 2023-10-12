import { Test, TestingModule } from '@nestjs/testing';
import { ResultsIpActorsController } from './results-ip-actors.controller';
import { ResultsIpActorsService } from './results-ip-actors.service';

describe('ResultsIpActorsController', () => {
  let controller: ResultsIpActorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsIpActorsController],
      providers: [ResultsIpActorsService],
    }).compile();

    controller = module.get<ResultsIpActorsController>(
      ResultsIpActorsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
