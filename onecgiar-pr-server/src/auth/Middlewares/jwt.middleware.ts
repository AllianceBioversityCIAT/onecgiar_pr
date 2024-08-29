import {
  Injectable,
  NestMiddleware,
  Next,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { env } from 'process';
import { AuthService } from '../auth.service';
import { UserLoginDto } from 'src/auth/dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { returnFormatSingin } from '../dto/return-fromat-singin.dto';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly _authService: AuthService,
    private readonly _jwtService: JwtService,
  ) {}

  async use(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    const authBasic: string = req.headers.authorization;
    const credentials: string | null = authBasic
      ? authBasic.split('Basic ')[1]
      : null;

    let jwtPayload: any, token_: string;
    try {
      if (credentials) {
        // decode nase 64 string
        const cre: string = Buffer.from(credentials, 'base64').toString(
          'utf-8',
        );
        // basic auth token creation
        const userLogin: UserLoginDto = {
          email: cre.split(':')[0],
          password: cre.split(':')[1],
        };

        const dataAuth: returnFormatSingin =
          await this._authService.singIn(userLogin);
        // get token
        token_ = dataAuth.response.token;
      } else {
        // get SBT authorization token
        token_ = <string>req.headers['auth'];
      }
      jwtPayload = await this._jwtService.verifyAsync(token_, {
        secret: env.JWT_SKEY,
        ignoreExpiration: true,
      });
      res.locals.jwtPayload = jwtPayload;

      const newToken: string = await this._jwtService.signAsync(
        { jwtPayload },
        { secret: env.JWT_SKEY, expiresIn: '7h' },
      );
      res.setHeader('auth', newToken);
      next();
    } catch (_error) {
      throw new HttpException(
        {
          message: 'Invalid token',
          response: {},
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
