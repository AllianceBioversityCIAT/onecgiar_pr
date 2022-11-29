import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  HttpException,
  UseFilters,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { UserLoginDto } from './dto/login-user.dto';
import { Response } from 'express';
import { HttpExceptionFilter } from '../shared/handlers/error.exception';
import { pusherAuthDot } from './dto/pusher-auth.dto';
import { HeadersDto } from '../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../shared/globalInterfaces/token.dto';

@Controller()
@UseFilters(new HttpExceptionFilter())
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Post('/singin')
  async singIn(@Body() userLogin: UserLoginDto, @Res() res: Response) {
    const { message, response, status } = await this.authService.singIn(
      userLogin,
    );
    throw new HttpException({ message, response }, status);
  }

  @Post('/signin/pusher/result/:resultId/:userId')
  @HttpCode(200)
  async signInPusher(
    @Body() pusherAuthDot: pusherAuthDot,
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
function PusherSocketId(arg0: string) {
  throw new Error('Function not implemented.');
}

function PusherChannel(arg0: string) {
  throw new Error('Function not implemented.');
}

