import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RouterModule } from '@nestjs/core';
import { AuthRoutes } from './auth.routes';

@Module({
  controllers: [AuthController],
  imports:[
    RouterModule.register(AuthRoutes)
  ],
  providers: [AuthService]
})
export class AuthModule {}
