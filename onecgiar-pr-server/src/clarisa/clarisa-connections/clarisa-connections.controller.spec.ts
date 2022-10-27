import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaConnectionsController } from './clarisa-connections.controller';
import { ClarisaConnectionsService } from './clarisa-connections.service';

describe('ClarisaConnectionsController', () => {
  let controller: ClarisaConnectionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaConnectionsController],
      providers: [ClarisaConnectionsService],
    }).compile();

    controller = module.get<ClarisaConnectionsController>(ClarisaConnectionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
