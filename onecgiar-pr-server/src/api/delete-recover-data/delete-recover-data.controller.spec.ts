import { Test, TestingModule } from '@nestjs/testing';
import { DeleteRecoverDataController } from './delete-recover-data.controller';
import { DeleteRecoverDataService } from './delete-recover-data.service';

describe('DeleteRecoverDataController', () => {
  let controller: DeleteRecoverDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeleteRecoverDataController],
      providers: [DeleteRecoverDataService],
    }).compile();

    controller = module.get<DeleteRecoverDataController>(DeleteRecoverDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
