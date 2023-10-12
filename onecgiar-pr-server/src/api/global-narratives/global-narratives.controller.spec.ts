import { Test, TestingModule } from '@nestjs/testing';
import { GlobalNarrativesController } from './global-narratives.controller';
import { GlobalNarrativesService } from './global-narratives.service';

describe('GlobalNarrativesController', () => {
  let controller: GlobalNarrativesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalNarrativesController],
      providers: [GlobalNarrativesService],
    }).compile();

    controller = module.get<GlobalNarrativesController>(
      GlobalNarrativesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
