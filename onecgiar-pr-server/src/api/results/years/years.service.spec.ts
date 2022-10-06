import { Test, TestingModule } from '@nestjs/testing';
import { YearsService } from './years.service';

describe('YearsService', () => {
  let service: YearsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YearsService],
    }).compile();

    service = module.get<YearsService>(YearsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
