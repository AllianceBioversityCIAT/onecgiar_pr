import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFullUserDto } from './dto/create-full-user.dto';
import { CreateComplementaryDataUserDto } from '../complementary-data-user/dto/create-complementary-data-user.dto';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('full')
  creteFull(@Body() createFullUserDto: CreateFullUserDto) {
    const createUser: CreateUserDto = createFullUserDto.userData;
    const createComplementaryData: CreateComplementaryDataUserDto =
      createFullUserDto.complementData;
    const role: number = createFullUserDto.role;

    const resultNewUser = this.userService.createFull(
      createUser,
      createComplementaryData,
      role,
    );
    return resultNewUser;
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
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
