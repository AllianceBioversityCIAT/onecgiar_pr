import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { ResultByLevelService } from './result-by-level.service';
import { CreateResultByLevelDto } from './dto/create-result-by-level.dto';
import { UpdateResultByLevelDto } from './dto/update-result-by-level.dto';

@Controller()
export class ResultByLevelController {
  constructor(private readonly resultByLevelService: ResultByLevelService) {}

  @Post()
  create(@Body() createResultByLevelDto: CreateResultByLevelDto) {
    return this.resultByLevelService.create(createResultByLevelDto);
  }

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.resultByLevelService.findAll();
    throw new HttpException({ message, response }, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultByLevelService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultByLevelDto: UpdateResultByLevelDto,
  ) {
    return this.resultByLevelService.update(+id, updateResultByLevelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultByLevelService.remove(+id);
  }
}
