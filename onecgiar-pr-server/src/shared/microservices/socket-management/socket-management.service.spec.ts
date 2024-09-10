import { Test, TestingModule } from '@nestjs/testing';
import { SocketManagementService } from './socket-management.service';

describe('SocketManagementService', () => {
  let service: SocketManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocketManagementService],
    }).compile();

    service = module.get<SocketManagementService>(SocketManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
