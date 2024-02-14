import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseFilters,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateFullUserDto } from './dto/create-full-user.dto';
import { HttpExceptionFilter } from '../../../shared/handlers/error.exception';
import { HttpException } from '@nestjs/common';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

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
    const { message, response, status } =
      await this.userService.findOneByEmail(email);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/initiative/:userId')
  @UseInterceptors(ResponseInterceptor)
  findInitiativeByUserId(@Param('userId') userId: number) {
    return this.userService.findInitiativeByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const { message, response, status } = await this.userService.findOne(+id);
    throw new HttpException({ message, response }, status);
  }
}
