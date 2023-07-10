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
import { ClarisaTocPhasesService } from './clarisa-toc-phases.service';
import { CreateClarisaTocPhaseDto } from './dto/create-clarisa-toc-phase.dto';
import { UpdateClarisaTocPhaseDto } from './dto/update-clarisa-toc-phase.dto';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaTocPhasesController {
  constructor(
    private readonly clarisaTocPhasesService: ClarisaTocPhasesService,
  ) {}

  @Post()
  create(@Body() createClarisaTocPhaseDto: CreateClarisaTocPhaseDto) {
    return this.clarisaTocPhasesService.create(createClarisaTocPhaseDto);
  }

  @Get()
  findAll() {
    return this.clarisaTocPhasesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaTocPhasesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClarisaTocPhaseDto: UpdateClarisaTocPhaseDto,
  ) {
    return this.clarisaTocPhasesService.update(+id, updateClarisaTocPhaseDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaTocPhasesService.remove(+id);
  }
}
