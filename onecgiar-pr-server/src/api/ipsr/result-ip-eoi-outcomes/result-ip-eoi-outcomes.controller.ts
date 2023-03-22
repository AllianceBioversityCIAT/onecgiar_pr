import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultIpEoiOutcomesService } from './result-ip-eoi-outcomes.service';
import { CreateResultIpEoiOutcomeDto } from './dto/create-result-ip-eoi-outcome.dto';
import { UpdateResultIpEoiOutcomeDto } from './dto/update-result-ip-eoi-outcome.dto';

@Controller('result-ip-eoi-outcomes')
export class ResultIpEoiOutcomesController {
  constructor(private readonly resultIpEoiOutcomesService: ResultIpEoiOutcomesService) {}

  @Post()
  create(@Body() createResultIpEoiOutcomeDto: CreateResultIpEoiOutcomeDto) {
    return this.resultIpEoiOutcomesService.create(createResultIpEoiOutcomeDto);
  }

  @Get()
  findAll() {
    return this.resultIpEoiOutcomesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultIpEoiOutcomesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultIpEoiOutcomeDto: UpdateResultIpEoiOutcomeDto) {
    return this.resultIpEoiOutcomesService.update(+id, updateResultIpEoiOutcomeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultIpEoiOutcomesService.remove(+id);
  }
}
