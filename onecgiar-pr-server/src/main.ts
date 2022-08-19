import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log(`The server is running on port ${3000} - http://localhost:${3000}/`);
}
bootstrap();
