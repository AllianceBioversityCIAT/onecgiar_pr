import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, VersioningType } from '@nestjs/common';
import express from 'express';
import * as awsServerlessExpress from 'aws-serverless-express';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

let cachedServer: any;

async function createServer() {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const logger: Logger = new Logger('Lambda');

  const app = await NestFactory.create(AppModule, adapter, {
    logger: logger,
    cors: true,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.use(
    helmet({
      xssFilter: true,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('PRMS Reporting API')
    .setDescription('PRMS Reporting API')
    .setVersion('1.0')
    .addSecurity('Authorization', {
      type: 'apiKey',
      'x-tokenName': 'auth',
      name: 'auth',
      in: 'header',
      description: 'Jwt token for authentication',
    })
    .addSecurityRequirements('Authorization')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      filter: true,
    },
  });

  await app.init();
  return awsServerlessExpress.createServer(expressApp);
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Debug logging to diagnose path stripping issue
  const logger = new Logger('Lambda Handler');
  logger.debug(`event.path: ${event.path}`);
  logger.debug(`event.requestContext?.path: ${event.requestContext?.path}`);
  logger.debug(
    `event.requestContext?.resourcePath: ${event.requestContext?.resourcePath}`,
  );

  // Fix: API Gateway/Base Path Mapping strips /api prefix before request reaches Lambda.
  // If the original path (requestContext.path) starts with /api but event.path doesn't,
  // restore the /api prefix so NestJS routing works correctly.
  const originalPath = event.requestContext?.path || '';
  const currentPath = event.path || '/';

  if (originalPath.startsWith('/api') && !currentPath.startsWith('/api')) {
    // API Gateway stripped /api, restore it
    const restoredPath = currentPath === '/' ? '/api' : `/api${currentPath}`;
    event.path = restoredPath;
    logger.debug(`Restored path from "${currentPath}" to "${event.path}"`);
  }

  if (!cachedServer) {
    cachedServer = await createServer();
  }

  return awsServerlessExpress.proxy(cachedServer, event, context, 'PROMISE')
    .promise;
};
