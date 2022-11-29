import { Test, TestingModule } from '@nestjs/testing';
import { CapdevsTermsController } from './capdevs-terms.controller';
import { CapdevsTermsService } from './capdevs-terms.service';

describe('CapdevsTermsController', () => {
  let controller: CapdevsTermsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapdevsTermsController],
      providers: [CapdevsTermsService],
    }).compile();

    controller = module.get<CapdevsTermsController>(CapdevsTermsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
