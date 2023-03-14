import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InnovationPathwayService } from './innovation-pathway.service';
import { CreateInnovationPathwayDto } from './dto/create-innovation-pathway.dto';
import { UpdateInnovationPathwayDto } from './dto/update-innovation-pathway.dto';

@Controller('innovation-pathway')
export class InnovationPathwayController {
  constructor(private readonly innovationPathwayService: InnovationPathwayService) {}

  @Post()
  create(@Body() createInnovationPathwayDto: CreateInnovationPathwayDto) {
    return this.innovationPathwayService.create(createInnovationPathwayDto);
  }

  @Get()
  findAll() {
    return this.innovationPathwayService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.innovationPathwayService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInnovationPathwayDto: UpdateInnovationPathwayDto) {
    return this.innovationPathwayService.update(+id, updateInnovationPathwayDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.innovationPathwayService.remove(+id);
  }
}
