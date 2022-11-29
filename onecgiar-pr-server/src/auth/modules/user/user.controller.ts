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
  UseFilters,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFullUserDto } from './dto/create-full-user.dto';
import { HttpExceptionFilter } from '../../../shared/handlers/error.exception';
import { HttpException } from '@nestjs/common';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
@UseFilters(new HttpExceptionFilter())
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('create')
  async creteFull(
    @Body() createFullUserDto: CreateFullUserDto,
    @Headers() auth: HeadersDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const createUser: CreateUserDto = createFullUserDto.userData;
    const role: number = createFullUserDto.role;
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );

    const { message, response, status } = await this.userService.createFull(
      createUser,
      role,
      token,
    );

    throw new HttpException({ message, response }, status);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } = await this.userService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get('get/all/:email')
  async findByEmail(@Param('email') email: string) {
    const { message, response, status } = await this.userService.findOneByEmail(
      email,
    );
    throw new HttpException({ message, response }, status);
  }

  @Get('get/initiative/:userId')
  async findInitiativeByUserId(@Param('userId') userId: number) {
    const { message, response, status } =
      await this.userService.findInitiativeByUserId(userId);
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const { message, response, status } = await this.userService.findOne(+id);
    throw new HttpException({ message, response }, status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
