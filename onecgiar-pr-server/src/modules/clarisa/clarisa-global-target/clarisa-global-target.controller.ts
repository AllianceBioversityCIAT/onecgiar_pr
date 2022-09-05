import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';
import { CreateClarisaGlobalTargetDto } from './dto/create-clarisa-global-target.dto';
import { UpdateClarisaGlobalTargetDto } from './dto/update-clarisa-global-target.dto';

@Controller()
export class ClarisaGlobalTargetController {
  constructor(private readonly clarisaGlobalTargetService: ClarisaGlobalTargetService) {}

  @Post()
  create(@Body() createClarisaGlobalTargetDto: CreateClarisaGlobalTargetDto) {
    return this.clarisaGlobalTargetService.create(createClarisaGlobalTargetDto);
  }

  @Get()
  findAll() {
    return this.clarisaGlobalTargetService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaGlobalTargetService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaGlobalTargetDto: UpdateClarisaGlobalTargetDto) {
    return this.clarisaGlobalTargetService.update(+id, updateClarisaGlobalTargetDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaGlobalTargetService.remove(+id);
  }
}
