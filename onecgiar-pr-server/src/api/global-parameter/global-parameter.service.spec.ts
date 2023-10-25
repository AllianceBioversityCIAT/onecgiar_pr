import { Test, TestingModule } from '@nestjs/testing';
import { GlobalParameterService } from './global-parameter.service';

describe('GlobalParameterService', () => {
  let service: GlobalParameterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalParameterService],
    }).compile();

    service = module.get<GlobalParameterService>(GlobalParameterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
