import { Test, TestingModule } from '@nestjs/testing';
import { ShareResultRequestController } from './share-result-request.controller';
import { ShareResultRequestService } from './share-result-request.service';

describe('ShareResultRequestController', () => {
  let controller: ShareResultRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShareResultRequestController],
      providers: [ShareResultRequestService],
    }).compile();

    controller = module.get<ShareResultRequestController>(ShareResultRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
