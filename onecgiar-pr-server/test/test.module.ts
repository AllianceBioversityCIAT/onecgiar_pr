import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

export const testModule = Test.createTestingModule({ imports: [AppModule] });

export const usePipes = (app) => {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
};
