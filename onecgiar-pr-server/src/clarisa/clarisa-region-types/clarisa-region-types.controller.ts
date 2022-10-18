import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaRegionTypesService } from './clarisa-region-types.service';
import { CreateRegionTypeDto } from './dto/create-region-type.dto';
import { UpdateRegionTypeDto } from './dto/update-region-type.dto';

@Controller('clarisa-region-types')
export class ClarisaRegionTypesController {
  constructor(private readonly regionTypesService: ClarisaRegionTypesService) {}

  @Post()
  create(@Body() createRegionTypeDto: CreateRegionTypeDto) {
    return this.regionTypesService.create(createRegionTypeDto);
  }

  @Get()
  findAll() {
    return this.regionTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.regionTypesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRegionTypeDto: UpdateRegionTypeDto,
  ) {
    return this.regionTypesService.update(+id, updateRegionTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.regionTypesService.remove(+id);
  }
}
