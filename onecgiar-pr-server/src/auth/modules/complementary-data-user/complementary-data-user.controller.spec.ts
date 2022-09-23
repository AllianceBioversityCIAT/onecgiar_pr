import { Test, TestingModule } from '@nestjs/testing';
import { ComplementaryDataUserController } from './complementary-data-user.controller';
import { ComplementaryDataUserService } from './complementary-data-user.service';

describe('ComplementaryDataUserController', () => {
  let controller: ComplementaryDataUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplementaryDataUserController],
      providers: [ComplementaryDataUserService],
    }).compile();

    controller = module.get<ComplementaryDataUserController>(
      ComplementaryDataUserController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
