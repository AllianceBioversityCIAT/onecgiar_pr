import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, VersioningType } from '@nestjs/common';
import express, { Express } from 'express';
import serverlessExpress from '@codegenie/serverless-express';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  Context,
  Handler,
} from 'aws-lambda';

let cachedHandler: Handler;

async function createApp(): Promise<Express> {
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
  return expressApp;
}

// Type guard to detect HTTP API v2.0 payload
function isHttpApiV2(
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
): event is APIGatewayProxyEventV2 {
  return 'rawPath' in event && 'requestContext' in event;
}

export const handler: Handler = async (
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  context: Context,
) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const logger = new Logger('Lambda Handler');

  // Unique log marker to confirm requests hit this Lambda
  logger.log('[PRMS-LAMBDA-HIT] Request received');

  // Debug: log payload format detection
  const isV2 = isHttpApiV2(event);
  logger.debug(`[PRMS-LAMBDA] Payload version: ${isV2 ? 'v2.0 (HTTP API)' : 'v1.0 (REST API)'}`);

  if (isV2) {
    // HTTP API v2.0 payload
    const v2Event = event as APIGatewayProxyEventV2;
    logger.debug(`[PRMS-LAMBDA] rawPath: ${v2Event.rawPath}`);
    logger.debug(`[PRMS-LAMBDA] requestContext.http.path: ${v2Event.requestContext?.http?.path}`);
    logger.debug(`[PRMS-LAMBDA] requestContext.http.method: ${v2Event.requestContext?.http?.method}`);
  } else {
    // REST API v1.0 payload
    const v1Event = event as APIGatewayProxyEvent;
    logger.debug(`[PRMS-LAMBDA] path: ${v1Event.path}`);
    logger.debug(`[PRMS-LAMBDA] requestContext.path: ${v1Event.requestContext?.path}`);
  }

  if (!cachedHandler) {
    const expressApp = await createApp();
    cachedHandler = serverlessExpress({ app: expressApp });
  }

  return cachedHandler(event, context, () => {});
};
