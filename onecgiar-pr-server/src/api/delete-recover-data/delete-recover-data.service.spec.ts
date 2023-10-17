import { Test, TestingModule } from '@nestjs/testing';
import { DeleteRecoverDataService } from './delete-recover-data.service';

describe('DeleteRecoverDataService', () => {
  let service: DeleteRecoverDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeleteRecoverDataService],
    }).compile();

    service = module.get<DeleteRecoverDataService>(DeleteRecoverDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
