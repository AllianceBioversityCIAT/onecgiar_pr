import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { GenderTagLevelsService } from './gender_tag_levels.service';
import { CreateGenderTagLevelDto } from './dto/create-gender_tag_level.dto';
import { UpdateGenderTagLevelDto } from './dto/update-gender_tag_level.dto';

@Controller('/')
export class GenderTagLevelsController {
  constructor(
    private readonly genderTagLevelsService: GenderTagLevelsService,
  ) {}

  @Post()
  create(@Body() createGenderTagLevelDto: CreateGenderTagLevelDto) {
    return this.genderTagLevelsService.create(createGenderTagLevelDto);
  }

  @Get('all')
  async findAll() {
    const { message, response, status } =
      await this.genderTagLevelsService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.genderTagLevelsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateGenderTagLevelDto: UpdateGenderTagLevelDto,
  ) {
    return this.genderTagLevelsService.update(+id, updateGenderTagLevelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.genderTagLevelsService.remove(+id);
  }
}
