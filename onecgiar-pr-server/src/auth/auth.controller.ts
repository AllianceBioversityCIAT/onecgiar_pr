import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  UseFilters,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/login-user.dto';
import { Response } from 'express';
import { HttpExceptionFilter } from '../shared/handlers/error.exception';

@Controller()
@UseFilters(new HttpExceptionFilter())
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // * Method to SignIn into PRMS Reporting 
  @Post('/singin')
  async singIn(@Body() userLogin: UserLoginDto, @Res() res: Response) {
    const { message, response, status } = await this.authService.singIn(
      userLogin,
    );
    throw new HttpException({ message, response }, status);
  }

}