import { Test, TestingModule } from '@nestjs/testing';
import { DynamodbLogsController } from './dynamodb-logs.controller';
import { DynamodbLogsService } from './dynamodb-logs.service';

describe('DynamodbLogsController', () => {
  let controller: DynamodbLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamodbLogsController],
      providers: [DynamodbLogsService],
    }).compile();

    controller = module.get<DynamodbLogsController>(DynamodbLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
