import { Test, TestingModule } from '@nestjs/testing';
import { ShareResultInnovationPackageRequestController } from './share-result-innovation-package-request.controller';
import { ShareResultInnovationPackageRequestService } from './share-result-innovation-package-request.service';

describe('ShareResultInnovationPackageRequestController', () => {
  let controller: ShareResultInnovationPackageRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShareResultInnovationPackageRequestController],
      providers: [ShareResultInnovationPackageRequestService],
    }).compile();

    controller = module.get<ShareResultInnovationPackageRequestController>(ShareResultInnovationPackageRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
