import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CapdevsTermsService } from './capdevs-terms.service';
import { CreateCapdevsTermDto } from './dto/create-capdevs-term.dto';
import { UpdateCapdevsTermDto } from './dto/update-capdevs-term.dto';

@Controller('capdevs-terms')
export class CapdevsTermsController {
  constructor(private readonly capdevsTermsService: CapdevsTermsService) {}

  @Post()
  create(@Body() createCapdevsTermDto: CreateCapdevsTermDto) {
    return this.capdevsTermsService.create(createCapdevsTermDto);
  }

  @Get()
  findAll() {
    return this.capdevsTermsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.capdevsTermsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCapdevsTermDto: UpdateCapdevsTermDto) {
    return this.capdevsTermsService.update(+id, updateCapdevsTermDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.capdevsTermsService.remove(+id);
  }
}
