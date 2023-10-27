import { Module } from '@nestjs/common';
import { DynamodbLogsService } from './dynamodb-logs.service';
import { DynamodbLogsController } from './dynamodb-logs.controller';
import { HandlersError } from '../../shared/handlers/error.utils';
import { LogRepository } from './dynamodb-logs.repository';

@Module({
  controllers: [DynamodbLogsController],
  providers: [DynamodbLogsService, HandlersError, LogRepository],
  exports: [LogRepository],
})
export class DynamodbLogsModule {}
