import { Test, TestingModule } from '@nestjs/testing';
import { DynamodbLogsService } from './dynamodb-logs.service';

describe('DynamodbLogsService', () => {
  let service: DynamodbLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamodbLogsService],
    }).compile();

    service = module.get<DynamodbLogsService>(DynamodbLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
