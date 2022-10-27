import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaConnectionsService } from './clarisa-connections.service';

describe('ClarisaConnectionsService', () => {
  let service: ClarisaConnectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaConnectionsService],
    }).compile();

    service = module.get<ClarisaConnectionsService>(ClarisaConnectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
