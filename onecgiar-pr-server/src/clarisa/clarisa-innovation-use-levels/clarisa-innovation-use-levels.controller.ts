import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';
import { CreateClarisaInnovationUseLevelDto } from './dto/create-clarisa-innovation-use-level.dto';
import { UpdateClarisaInnovationUseLevelDto } from './dto/update-clarisa-innovation-use-level.dto';

@Controller()
export class ClarisaInnovationUseLevelsController {
  constructor(
    private readonly clarisaInnovationUseLevelsService: ClarisaInnovationUseLevelsService,
  ) {}

  @Post()
  create(
    @Body()
    createClarisaInnovationUseLevelDto: CreateClarisaInnovationUseLevelDto,
  ) {
    return this.clarisaInnovationUseLevelsService.create(
      createClarisaInnovationUseLevelDto,
    );
  }

  @Get()
  async findAll() {
    return this.clarisaInnovationUseLevelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInnovationUseLevelsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateClarisaInnovationUseLevelDto: UpdateClarisaInnovationUseLevelDto,
  ) {
    return this.clarisaInnovationUseLevelsService.update(
      +id,
      updateClarisaInnovationUseLevelDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaInnovationUseLevelsService.remove(+id);
  }
}
