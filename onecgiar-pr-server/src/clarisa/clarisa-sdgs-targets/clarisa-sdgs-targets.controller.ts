import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaSdgsTargetsService } from './clarisa-sdgs-targets.service';
import { CreateClarisaSdgsTargetDto } from './dto/create-clarisa-sdgs-target.dto';
import { UpdateClarisaSdgsTargetDto } from './dto/update-clarisa-sdgs-target.dto';

@Controller('clarisa-sdgs-targets')
export class ClarisaSdgsTargetsController {
  constructor(private readonly clarisaSdgsTargetsService: ClarisaSdgsTargetsService) {}

  @Post()
  create(@Body() createClarisaSdgsTargetDto: CreateClarisaSdgsTargetDto) {
    return this.clarisaSdgsTargetsService.create(createClarisaSdgsTargetDto);
  }

  @Get()
  findAll() {
    return this.clarisaSdgsTargetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaSdgsTargetsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaSdgsTargetDto: UpdateClarisaSdgsTargetDto) {
    return this.clarisaSdgsTargetsService.update(+id, updateClarisaSdgsTargetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaSdgsTargetsService.remove(+id);
  }
}
