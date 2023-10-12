import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaRegionsCgiarService } from './clarisa-regions-cgiar.service';
import { CreateClarisaRegionsCgiarDto } from './dto/create-clarisa-regions-cgiar.dto';
import { UpdateClarisaRegionsCgiarDto } from './dto/update-clarisa-regions-cgiar.dto';

@Controller('clarisa-regions-cgiar')
export class ClarisaRegionsCgiarController {
  constructor(
    private readonly clarisaRegionsCgiarService: ClarisaRegionsCgiarService,
  ) {}

  @Post()
  create(@Body() createClarisaRegionsCgiarDto: CreateClarisaRegionsCgiarDto) {
    return this.clarisaRegionsCgiarService.create(createClarisaRegionsCgiarDto);
  }

  @Get()
  findAll() {
    return this.clarisaRegionsCgiarService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaRegionsCgiarService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClarisaRegionsCgiarDto: UpdateClarisaRegionsCgiarDto,
  ) {
    return this.clarisaRegionsCgiarService.update(
      +id,
      updateClarisaRegionsCgiarDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaRegionsCgiarService.remove(+id);
  }
}
