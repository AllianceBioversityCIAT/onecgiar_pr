import { Injectable, Module, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { env } from 'process';
import { LoginUtil } from '../auth/utils/login.util'
import { verify, sign } from 'jsonwebtoken';

@Injectable()
export class JwtMiddleware implements NestMiddleware {

  constructor( 
    private readonly _loginUtil: LoginUtil 
    ){}

  async use(req: Request, res: Response, next: Function) {
    const authBasic: string = req.headers.authorization;
    const credentials: string|null = authBasic ? authBasic.split('Basic ')[1] : null;

    let jwtPayload: verifyResults, token_ : string;
    const data = await this._loginUtil.createJWToken('', 'password');
    console.log(data)
    next();
    /*try {
      if (credentials) {
        // decode nase 64 string
        let cre: string = Buffer.from(credentials, 'base64').toString('utf-8');
        // basic auth token creation
        const email: string = cre.split(':')[0];
        const password: string = cre.split(':')[1];

        // get token
        token_ = token;
      } else {
        // get SBT authorization token
        token_ = <string>req.headers['auth'];
      }
      
      jwtPayload = <verifyResults>verify(token_, env.JWT_SKEY);
      res.locals.jwtPayload = jwtPayload;
      next();
    } catch (error) {
      //const err = new BaseError(error.name, 400, error.message, false);
      return res.status(404).json('err');
    }
    
    const newToken = sign(jwtPayload, env.JWT_SKEY, {
      expiresIn: '7h'
    });
    res.setHeader('token', newToken);
    */
  }
}

