import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaActionAreaOutcomeService } from './clarisa-action-area-outcome.service';
import { CreateClarisaActionAreaOutcomeDto } from './dto/create-clarisa-action-area-outcome.dto';
import { UpdateClarisaActionAreaOutcomeDto } from './dto/update-clarisa-action-area-outcome.dto';

@Controller('clarisa-action-area-outcome')
export class ClarisaActionAreaOutcomeController {
  constructor(private readonly clarisaActionAreaOutcomeService: ClarisaActionAreaOutcomeService) {}

  @Post()
  create(@Body() createClarisaActionAreaOutcomeDto: CreateClarisaActionAreaOutcomeDto) {
    return this.clarisaActionAreaOutcomeService.create(createClarisaActionAreaOutcomeDto);
  }

  @Get()
  findAll() {
    return this.clarisaActionAreaOutcomeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaActionAreaOutcomeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaActionAreaOutcomeDto: UpdateClarisaActionAreaOutcomeDto) {
    return this.clarisaActionAreaOutcomeService.update(+id, updateClarisaActionAreaOutcomeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaActionAreaOutcomeService.remove(+id);
  }
}
