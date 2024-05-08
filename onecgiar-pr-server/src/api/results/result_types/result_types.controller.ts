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
import { ResultTypesService } from './result_types.service';
import { CreateResultTypeDto } from './dto/create-result_type.dto';
import { UpdateResultTypeDto } from './dto/update-result_type.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('')
@UseInterceptors(ResponseInterceptor)
export class ResultTypesController {
  constructor(private readonly resultTypesService: ResultTypesService) {}

  @Post()
  create(@Body() createResultTypeDto: CreateResultTypeDto) {
    return this.resultTypesService.create(createResultTypeDto);
  }

  @Get('all')
  findAll() {
    return this.resultTypesService.getAllResultType();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultTypesService.findOneResultType(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultTypeDto: UpdateResultTypeDto,
  ) {
    return this.resultTypesService.update(+id, updateResultTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultTypesService.remove(+id);
  }
}
