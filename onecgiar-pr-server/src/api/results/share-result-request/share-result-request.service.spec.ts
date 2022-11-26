import { Test, TestingModule } from '@nestjs/testing';
import { ShareResultRequestService } from './share-result-request.service';

describe('ShareResultRequestService', () => {
  let service: ShareResultRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShareResultRequestService],
    }).compile();

    service = module.get<ShareResultRequestService>(ShareResultRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
