import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BILATERAL_UNAUTHORIZED_MESSAGE } from '../constants/bilateral-auth.constants';
import { BILATERAL_CLARISA_ENDPOINT_KEY } from '../decorators/bilateral-clarisa-endpoint.decorator';
import { ClarisaApiKeyValidationService } from '../services/clarisa-api-key-validation.service';

@Injectable()
export class ClarisaApiKeyGuard implements CanActivate {
  constructor(
    private readonly clarisaApiKeyValidationService: ClarisaApiKeyValidationService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE);
    }

    const endpointAccessed = this.reflector.get<string>(
      BILATERAL_CLARISA_ENDPOINT_KEY,
      context.getHandler(),
    );

    if (!endpointAccessed) {
      throw new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE);
    }

    const isValid = await this.clarisaApiKeyValidationService.validate(
      apiKey,
      endpointAccessed,
      this.extractClientIp(request),
    );

    if (!isValid) {
      throw new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE);
    }

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    const headerValue = request.headers['x-api-key'];

    if (Array.isArray(headerValue)) {
      return headerValue[0]?.trim() || undefined;
    }

    const apiKey = headerValue?.trim();
    return apiKey || undefined;
  }

  private extractClientIp(request: Request): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor || request.socket?.remoteAddress;

    return typeof ip === 'string' ? ip.trim() : undefined;
  }
}
