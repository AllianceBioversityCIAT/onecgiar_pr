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

  @Get()
  findAll() {
    return this.clarisaTocPhasesService.findAll();
  }
}
