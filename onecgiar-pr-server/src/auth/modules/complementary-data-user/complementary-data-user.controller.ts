import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ComplementaryDataUserService } from './complementary-data-user.service';
import { CreateComplementaryDataUserDto } from './dto/create-complementary-data-user.dto';
import { UpdateComplementaryDataUserDto } from './dto/update-complementary-data-user.dto';

@Controller()
export class ComplementaryDataUserController {
  constructor(
    private readonly complementaryDataUserService: ComplementaryDataUserService,
  ) {}

  @Post()
  create(
    @Body() createComplementaryDataUserDto: CreateComplementaryDataUserDto,
  ) {
    return this.complementaryDataUserService.create(
      createComplementaryDataUserDto,
    );
  }

  @Get()
  findAll() {
    return this.complementaryDataUserService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.complementaryDataUserService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComplementaryDataUserDto: UpdateComplementaryDataUserDto,
  ) {
    return this.complementaryDataUserService.update(
      +id,
      updateComplementaryDataUserDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.complementaryDataUserService.remove(+id);
  }
}
