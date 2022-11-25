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

  @Post('/singin/pusher/result/:resultId/:userId)
  async singInPusher(
    @Body() pusherAuthDot: pusherAuthDot,
    @Param('resultId') resultId: number,
    @Param('userId') userId: number,

    ) {
 
    const { message, response, status } = await this.authService.puserAuth(
      pusherAuthDot,
      resultId,
      userId
    );
    throw new HttpException({ message, response }, status);
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
