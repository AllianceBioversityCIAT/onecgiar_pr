import { Routes } from '@nestjs/core';
import { DynamodbLogsModule } from './dynamodb-logs/dynamodb-logs.module';

export const dynamoRoutes: Routes = [
  {
    path: 'result/actions',
    module: DynamodbLogsModule,
  },
];
