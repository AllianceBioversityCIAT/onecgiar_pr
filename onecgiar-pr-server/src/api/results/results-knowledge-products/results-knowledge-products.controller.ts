import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { CreateResultsKnowledgeProductDto } from './dto/create-results-knowledge-product.dto';
import { UpdateResultsKnowledgeProductDto } from './dto/update-results-knowledge-product.dto';

@Controller()
export class ResultsKnowledgeProductsController {
  constructor(
    private readonly resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
  ) {}

  @Post()
  create(
    @Body() createResultsKnowledgeProductDto: CreateResultsKnowledgeProductDto,
  ) {
    return this.resultsKnowledgeProductsService.create(
      createResultsKnowledgeProductDto,
    );
  }

  @Get()
  findAll() {
    return this.resultsKnowledgeProductsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsKnowledgeProductsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResultsKnowledgeProductDto: UpdateResultsKnowledgeProductDto,
  ) {
    return this.resultsKnowledgeProductsService.update(
      +id,
      updateResultsKnowledgeProductDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsKnowledgeProductsService.remove(+id);
  }
}
