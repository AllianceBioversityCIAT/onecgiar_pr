import { Test, TestingModule } from '@nestjs/testing';
import { VersioningController } from './versioning.controller';
import { VersioningService } from './versioning.service';

describe('VersioningController', () => {
  let controller: VersioningController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersioningController],
      providers: [VersioningService],
    }).compile();

    controller = module.get<VersioningController>(VersioningController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
