import { Test, TestingModule } from '@nestjs/testing';
import { ShareResultInnovationPackageRequestService } from './share-result-innovation-package-request.service';

describe('ShareResultInnovationPackageRequestService', () => {
  let service: ShareResultInnovationPackageRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShareResultInnovationPackageRequestService],
    }).compile();

    service = module.get<ShareResultInnovationPackageRequestService>(ShareResultInnovationPackageRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
