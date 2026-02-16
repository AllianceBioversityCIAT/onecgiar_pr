import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DISABLED_ENDPOINT_KEY } from '../decorators/disabled-endpoint.decorator';

@Injectable()
export class DisabledEndpointGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const disabled = this.reflector.get<boolean>(
      DISABLED_ENDPOINT_KEY,
      context.getHandler(),
    );
    if (disabled) {
      throw new NotFoundException('This endpoint is not available');
    }
    return true;
  }
}
