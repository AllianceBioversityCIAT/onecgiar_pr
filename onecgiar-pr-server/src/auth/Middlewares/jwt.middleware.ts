import {
  Injectable,
  NestMiddleware,
  Next,
  Req,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { env } from 'process';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name);

  private readonly publicRoutes = [
    '/login/provider',
    '/login/custom',
    '/validate/code',
  ];

  constructor(private readonly _jwtService: JwtService) {}

  async use(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      const isPublicRoute = this.publicRoutes.some((route) =>
        req.path.includes(route),
      );

      if (isPublicRoute) {
        this.logger.debug(`Public route accessed: ${req.path}`);
        return next();
      }

      const authBasic: string = req.headers.authorization;
      const authToken: string = req.headers['auth'] as string;

      let jwtPayload: any;

      if (authBasic?.startsWith('Basic ')) {
        this.logger.warn(
          'Basic Auth not allowed in middleware. Use /auth/login/custom endpoint.',
        );
        throw new HttpException(
          {
            message: 'Basic Auth not allowed. Use login endpoint.',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!authToken) {
        throw new HttpException(
          {
            message: 'Authorization token is required',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const token: string = authToken;

      try {
        jwtPayload = await this._jwtService.verifyAsync(token, {
          secret: env.JWT_SKEY,
        });
      } catch (jwtError) {
        this.logger.warn(`JWT verification failed: ${jwtError.message}`);

        if (jwtError.name === 'TokenExpiredError') {
          throw new HttpException(
            {
              message: 'Token has expired',
              response: {
                valid: false,
                shouldRefreshToken: true,
              },
            },
            HttpStatus.UNAUTHORIZED,
          );
        }

        throw new HttpException(
          {
            message: 'Invalid token',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (!jwtPayload || !jwtPayload.id || !jwtPayload.email) {
        throw new HttpException(
          {
            message: 'Invalid token payload',
            response: {
              valid: false,
              shouldRedirectToLogin: true,
            },
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      res.locals.jwtPayload = jwtPayload;

      const newToken: string = await this._jwtService.signAsync(
        {
          id: jwtPayload.id,
          email: jwtPayload.email,
          first_name: jwtPayload.first_name,
          last_name: jwtPayload.last_name,
        },
        {
          secret: env.JWT_SKEY,
          expiresIn: '7h',
        },
      );

      res.setHeader('auth', newToken);

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Unexpected error in JWT middleware: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          message: 'Authentication failed',
          response: {
            valid: false,
            shouldRedirectToLogin: true,
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
