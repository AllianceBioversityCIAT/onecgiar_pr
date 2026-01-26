import { Test, TestingModule } from '@nestjs/testing';
import { ResultImpactAreaScoresController } from './result-impact-area-scores.controller';
import { ResultImpactAreaScoresService } from './result-impact-area-scores.service';

describe('ResultImpactAreaScoresController', () => {
  let controller: ResultImpactAreaScoresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultImpactAreaScoresController],
      providers: [
        {
          provide: ResultImpactAreaScoresService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get(ResultImpactAreaScoresController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });
});

