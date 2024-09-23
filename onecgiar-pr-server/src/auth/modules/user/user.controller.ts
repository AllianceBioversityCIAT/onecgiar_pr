import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateFullUserDto } from './dto/create-full-user.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { ApiTags, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users')
@ApiHeader({
  name: 'auth',
  description: 'the token we need for auth.',
})
@Controller()
@UseInterceptors(ResponseInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
  })
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

  @ApiOperation({ summary: 'Find user by email' })
  @ApiResponse({
    status: 200,
    description: 'User found by email',
  })
  @Get('get/all/:email')
  async findByEmail(@Param('email') email: string) {
    return this.userService.findOneByEmail(email);
  }

  @ApiOperation({ summary: 'Find user initiatives by user id' })
  @ApiResponse({
    status: 200,
    description: 'Initiatives found',
  })
  @Get('get/initiative/:userId')
  findInitiativeByUserId(@Param('userId') userId: number) {
    return this.userService.findInitiativeByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update the last pop-up viewed' })
  @ApiResponse({
    status: 200,
    description: 'Last pop-up viewed updated successfully',
  })
  @Patch('last-pop-up-viewed/:userId')
  async lastPopUpViewed(@Param('userId') userId: number) {
    return this.userService.lastPopUpViewed(userId);
  }
}
