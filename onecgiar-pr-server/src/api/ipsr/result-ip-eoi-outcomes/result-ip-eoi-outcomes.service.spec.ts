import { Test, TestingModule } from '@nestjs/testing';
import { ResultIpEoiOutcomesService } from './result-ip-eoi-outcomes.service';

describe('ResultIpEoiOutcomesService', () => {
  let service: ResultIpEoiOutcomesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultIpEoiOutcomesService],
    }).compile();

    service = module.get<ResultIpEoiOutcomesService>(ResultIpEoiOutcomesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
