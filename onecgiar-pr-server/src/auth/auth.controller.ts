import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UserLoginDto } from './dto/login-user.dto';
import { PusherAuthDot } from './dto/pusher-auth.dto';
import { ResponseInterceptor } from '../shared/Interceptors/Return-data.interceptor';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('auth')
@UseInterceptors(ResponseInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Post('/singin')
  @ApiSecurity('')
  singIn(@Body() userLogin: UserLoginDto) {
    return this.authService.singIn(userLogin);
  }

  @Post('/signin/pusher/result/:resultId/:userId')
  @UseInterceptors()
  @HttpCode(200)
  async signInPusher(
    @Body() pusherAuthDot: PusherAuthDot,
    @Param('resultId') resultId: number,
    @Param('userId') userId: number,
  ) {
    const response = await this.authService.pusherAuth(
      pusherAuthDot,
      resultId,
      userId,
    );
    return response.auth;
  }
}

//TODO check if this code is planned to do something in the future
/*function PusherSocketId(arg0: string) {
  throw new Error('Function not implemented.');
}

function PusherChannel(arg0: string) {
  throw new Error('Function not implemented.');
}*/
