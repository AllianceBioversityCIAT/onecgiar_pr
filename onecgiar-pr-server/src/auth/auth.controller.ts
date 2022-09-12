import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { UserLoginDto } from './dto/login-user.dto';
import { Response, Request } from 'express';

@Controller()
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

  @Get('/singin')
  async singIn(@Body() userLogin: UserLoginDto, @Res() res: Response) {
    const { code, token, validate, user } = await this.authService.singIn(
      userLogin,
    );
    res
      .setHeader('auth',token)
      .json({
        validate,
        token,
        user: validate
          ? {
              id: user.id,
              user_name: `${user.first_name} ${user.last_name}`,
              email: user.email,
            }
          : null,
      })
      .status(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
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
