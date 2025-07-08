import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RequestWithThrottle extends Request {
  userSearchThrottle?: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class SearchThrottleMiddleware implements NestMiddleware {
  private readonly _logger: Logger = new Logger(SearchThrottleMiddleware.name);
  private readonly requests = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly maxRequests = 30;
  private readonly windowMs = 60 * 1000;

  use(req: RequestWithThrottle, res: Response, next: NextFunction) {
    if (!req.path.includes('/users/search')) {
      return next();
    }

    const clientId = this.getClientIdentifier(req);
    const now = Date.now();

    this.cleanupOldRequests(now);

    const userRequests = this.requests.get(clientId);

    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return next();
    }

    if (userRequests.count >= this.maxRequests) {
      const remainingTime = Math.ceil((userRequests.resetTime - now) / 1000);
      throw new HttpException(
        {
          message: 'Too many search requests',
          error: 'Rate limit exceeded',
          retryAfter: remainingTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    userRequests.count++;
    this.requests.set(clientId, userRequests);

    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader(
      'X-RateLimit-Remaining',
      this.maxRequests - userRequests.count,
    );
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(userRequests.resetTime).toISOString(),
    );

    next();
  }

  private getClientIdentifier(req: Request): string {
    const authHeader = req.headers['auth'] || req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string') {
      try {
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : authHeader;
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        return `user_${payload.id || payload.sub}`;
      } catch (error) {
        this._logger.error('Failed to parse auth header', error);
      }
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor || req.connection.remoteAddress;
    return `ip_${ip}`;
  }

  private cleanupOldRequests(now: number): void {
    if (this.requests.size > 1000) {
      for (const [key, value] of this.requests.entries()) {
        if (now > value.resetTime) {
          this.requests.delete(key);
        }
      }
    }
  }
}
