import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseFilters,
  HttpException,
  Headers,
} from '@nestjs/common';
import { RoleByUserService } from './role-by-user.service';
import { CreateRoleByUserDto } from './dto/create-role-by-user.dto';
import { HttpExceptionFilter } from '../../../shared/handlers/error.exception';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';

@Controller()
@UseFilters(new HttpExceptionFilter())
export class RoleByUserController {
  constructor(private readonly roleByUserService: RoleByUserService) {}

  @Post()
  async create(
    @Body() createRoleByUserDto: CreateRoleByUserDto,
    @Headers() auth: HeadersDto,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } = await this.roleByUserService.create(
      createRoleByUserDto,
      token,
    );
    throw new HttpException({ message, response }, status);
  }

  @Get('get/user/:id')
  async findAll(@Param('id') userId: number) {
    const { message, response, status } =
      await this.roleByUserService.allRolesByUser(userId);
    throw new HttpException({ message, response }, status);
  }
}
