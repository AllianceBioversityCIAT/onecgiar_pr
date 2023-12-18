import {
  Controller,
  Post,
  Body,
  Param,
  HttpException,
  UseFilters,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UserLoginDto } from './dto/login-user.dto';
import { HttpExceptionFilter } from '../shared/handlers/error.exception';
import { PusherAuthDot } from './dto/pusher-auth.dto';

@Controller()
@UseFilters(new HttpExceptionFilter())
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Post('/singin')
  async singIn(@Body() userLogin: UserLoginDto) {
    const { message, response, status } =
      await this.authService.singIn(userLogin);
    throw new HttpException({ message, response }, status);
  }

  @Post('/signin/pusher/result/:resultId/:userId')
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
