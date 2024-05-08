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
import { EvidenceTypesService } from './evidence_types.service';
import { CreateEvidenceTypeDto } from './dto/create-evidence_type.dto';
import { UpdateEvidenceTypeDto } from './dto/update-evidence_type.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('evidence-types')
@UseInterceptors(ResponseInterceptor)
export class EvidenceTypesController {
  constructor(private readonly evidenceTypesService: EvidenceTypesService) {}

  @Post()
  create(@Body() createEvidenceTypeDto: CreateEvidenceTypeDto) {
    return this.evidenceTypesService.create(createEvidenceTypeDto);
  }

  @Get('all')
  findAll() {
    return this.evidenceTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evidenceTypesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEvidenceTypeDto: UpdateEvidenceTypeDto,
  ) {
    return this.evidenceTypesService.update(+id, updateEvidenceTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evidenceTypesService.remove(+id);
  }
}
