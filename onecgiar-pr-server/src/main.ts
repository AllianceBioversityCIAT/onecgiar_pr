import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from 'process';

import { dataSource } from './config/orm.config';
import { ddbClient } from './config/dynamo.config';
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DescribeTableCommand, PutItemCommand, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = env.PORT || 3000;

  await dataSource
    .initialize()
    .then(() => {
      console.log('si');
    })
    .catch((error) => {
      console.log(error);
    });

    

  await app.listen(port);
  console.log(
    `The server is running on port ${port} - http://localhost:${port}/`,
  );
}
bootstrap();
