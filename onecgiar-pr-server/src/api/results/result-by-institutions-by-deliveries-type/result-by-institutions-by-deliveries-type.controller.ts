import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultByInstitutionsByDeliveriesTypeService } from './result-by-institutions-by-deliveries-type.service';
import { CreateResultByInstitutionsByDeliveriesTypeDto } from './dto/create-result-by-institutions-by-deliveries-type.dto';
import { UpdateResultByInstitutionsByDeliveriesTypeDto } from './dto/update-result-by-institutions-by-deliveries-type.dto';

@Controller('result-by-institutions-by-deliveries-type')
export class ResultByInstitutionsByDeliveriesTypeController {
  constructor(private readonly resultByInstitutionsByDeliveriesTypeService: ResultByInstitutionsByDeliveriesTypeService) {}

  @Post()
  create(@Body() createResultByInstitutionsByDeliveriesTypeDto: CreateResultByInstitutionsByDeliveriesTypeDto) {
    return this.resultByInstitutionsByDeliveriesTypeService.create(createResultByInstitutionsByDeliveriesTypeDto);
  }

  @Get()
  findAll() {
    return this.resultByInstitutionsByDeliveriesTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultByInstitutionsByDeliveriesTypeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultByInstitutionsByDeliveriesTypeDto: UpdateResultByInstitutionsByDeliveriesTypeDto) {
    return this.resultByInstitutionsByDeliveriesTypeService.update(+id, updateResultByInstitutionsByDeliveriesTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultByInstitutionsByDeliveriesTypeService.remove(+id);
  }
}
