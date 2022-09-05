import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RouterModule } from '@nestjs/core';
import { AuthRoutes } from './auth.routes';
import { LoginUtil } from './utils/login.util';

@Module({
  controllers: [AuthController],
  imports:[
    RouterModule.register(AuthRoutes)
  ],
  providers: [
    AuthService,
    LoginUtil
  ],
  exports: [
    LoginUtil
  ]
})
export class AuthModule {}
