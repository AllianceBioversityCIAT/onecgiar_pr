import { Test, TestingModule } from '@nestjs/testing';
import { ComplementaryDataUserService } from './complementary-data-user.service';

describe('ComplementaryDataUserService', () => {
  let service: ComplementaryDataUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplementaryDataUserService],
    }).compile();

    service = module.get<ComplementaryDataUserService>(
      ComplementaryDataUserService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
