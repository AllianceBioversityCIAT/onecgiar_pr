import { Test, TestingModule } from '@nestjs/testing';
import { ResultImpactAreaScoresModule } from './result-impact-area-scores.module';
import { ResultImpactAreaScoresService } from './result-impact-area-scores.service';

describe('ResultImpactAreaScoresModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ResultImpactAreaScoresModule],
    })
      .overrideProvider(ResultImpactAreaScoresService)
      .useValue({})
      .compile();

    expect(module).toBeDefined();
  });
});

