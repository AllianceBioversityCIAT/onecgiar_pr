import { Test, TestingModule } from '@nestjs/testing';
import { RestrictionsController } from './restrictions.controller';
import { RestrictionsService } from './restrictions.service';

describe('RestrictionsController', () => {
  let controller: RestrictionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestrictionsController],
      providers: [RestrictionsService],
    }).compile();

    controller = module.get<RestrictionsController>(RestrictionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
