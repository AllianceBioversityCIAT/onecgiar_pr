import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from 'process';

import { dataSource } from './config/orm.config';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  const port = env.PORT || 3000;

  await dataSource
    .initialize()
    .then(() => {
      console.log('Initialized server');
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
