import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultQuestionsService } from './result-questions.service';
import { CreateResultQuestionDto } from './dto/create-result-question.dto';
import { UpdateResultQuestionDto } from './dto/update-result-question.dto';

@Controller('result-questions')
export class ResultQuestionsController {
  constructor(private readonly resultQuestionsService: ResultQuestionsService) {}

  @Post()
  create(@Body() createResultQuestionDto: CreateResultQuestionDto) {
    return this.resultQuestionsService.create(createResultQuestionDto);
  }

  @Get()
  findAll() {
    return this.resultQuestionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultQuestionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultQuestionDto: UpdateResultQuestionDto) {
    return this.resultQuestionsService.update(+id, updateResultQuestionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultQuestionsService.remove(+id);
  }
}
