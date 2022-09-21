import { Test, TestingModule } from '@nestjs/testing';
import { InititiativesService } from './inititiatives.service';

describe('InititiativesService', () => {
  let service: InititiativesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InititiativesService],
    }).compile();

    service = module.get<InititiativesService>(InititiativesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
