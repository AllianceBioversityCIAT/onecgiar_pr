import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { GlobalNarrativesService } from './global-narratives.service';
import { CreateGlobalNarrativeDto } from './dto/create-global-narrative.dto';
import { UpdateGlobalNarrativeDto } from './dto/update-global-narrative.dto';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class GlobalNarrativesController {
  constructor(
    private readonly globalNarrativesService: GlobalNarrativesService,
  ) {}

  @Post()
  create(@Body() createGlobalNarrativeDto: CreateGlobalNarrativeDto) {
    return this.globalNarrativesService.create(createGlobalNarrativeDto);
  }

  @Get()
  findAll() {
    return this.globalNarrativesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.globalNarrativesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateGlobalNarrativeDto: UpdateGlobalNarrativeDto,
  ) {
    return this.globalNarrativesService.update(+id, updateGlobalNarrativeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.globalNarrativesService.remove(+id);
  }
}
