/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { LoginUtil } from 'src/auth/utils/login.util';
import { JwtMiddleware } from './jwt.middleware';

@Module({
    imports: [
        LoginUtil
    ],
    controllers: [],
    providers: [],
})
export class MiddlewareModule { }
