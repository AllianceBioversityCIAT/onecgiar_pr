import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from 'process';

import { dataSource } from './config/orm.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  console.log(`The server is running on port ${port} - http://localhost:${port}/`);
}
bootstrap();
