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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFullUserDto } from './dto/create-full-user.dto';
import { CreateComplementaryDataUserDto } from '../complementary-data-user/dto/create-complementary-data-user.dto';
import { HttpExceptionFilter } from '../../../shared/handlers/error.exception';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller()
@UseFilters(new HttpExceptionFilter())
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('create')
  async creteFull(@Body() createFullUserDto: CreateFullUserDto, @Res() res: Response, @Req() req: Request) {
    const createUser: CreateUserDto = createFullUserDto.userData;
    const createComplementaryData: CreateComplementaryDataUserDto =
      createFullUserDto.complementData;
    const role: number = createFullUserDto.role;

    const {message, response, status} = await this.userService.createFull(
      createUser,
      createComplementaryData,
      role,
    );

    throw new HttpException({message,response}, status);
  }

  @Get('all')
  async findAll() {
    const {message, response, status} = await this.userService.findAll();
    throw new HttpException({message,response}, status);
  }

  @Get('all/full')
  async findAllFull() {
    const {message, response, status} = await this.userService.findAllFull();
    throw new HttpException({message,response}, status);
  }

  @Get('all/:email')
  async findByEmail(@Param('email') email: string) {
    const {message, response, status} = await this.userService.findOneByEmail(email);
    throw new HttpException({message,response}, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const {message, response, status} = await this.userService.findOne(+id);
    throw new HttpException({message,response}, status);
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
