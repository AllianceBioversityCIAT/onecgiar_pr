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
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('create')
  async creteFull(
    @Body() createFullUserDto: CreateFullUserDto,
    @UserToken() user: TokenDto,
  ) {
    const createUser: CreateUserDto = createFullUserDto.userData;
    const role: number = createFullUserDto.role;
    return this.userService.createFull(createUser, role, user);
  }

  @Get('get/all')
  async findAll() {
    return this.userService.findAll();
  }

  @Get('get/all/:email')
  async findByEmail(@Param('email') email: string) {
    return this.userService.findOneByEmail(email);
  }

  @Get('get/initiative/:userId')
  findInitiativeByUserId(@Param('userId') userId: number) {
    return this.userService.findInitiativeByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }
}
