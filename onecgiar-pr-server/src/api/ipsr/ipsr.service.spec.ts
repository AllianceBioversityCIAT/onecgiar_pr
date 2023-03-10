import { Test, TestingModule } from '@nestjs/testing';
import { IpsrService } from './ipsr.service';

describe('IpsrService', () => {
  let service: IpsrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpsrService],
    }).compile();

    service = module.get<IpsrService>(IpsrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
