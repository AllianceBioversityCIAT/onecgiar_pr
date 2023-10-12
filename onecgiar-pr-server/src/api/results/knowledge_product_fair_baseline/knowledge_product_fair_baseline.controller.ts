import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { KnowledgeProductFairBaselineService } from './knowledge_product_fair_baseline.service';
import { CreateKnowledgeProductFairBaselineDto } from './dto/create-knowledge_product_fair_baseline.dto';
import { UpdateKnowledgeProductFairBaselineDto } from './dto/update-knowledge_product_fair_baseline.dto';

@Controller('knowledge-product-fair-baseline')
export class KnowledgeProductFairBaselineController {
  constructor(
    private readonly knowledgeProductFairBaselineService: KnowledgeProductFairBaselineService,
  ) {}

  @Post()
  create(
    @Body()
    createKnowledgeProductFairBaselineDto: CreateKnowledgeProductFairBaselineDto,
  ) {
    return this.knowledgeProductFairBaselineService.create(
      createKnowledgeProductFairBaselineDto,
    );
  }

  @Get()
  findAll() {
    return this.knowledgeProductFairBaselineService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.knowledgeProductFairBaselineService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateKnowledgeProductFairBaselineDto: UpdateKnowledgeProductFairBaselineDto,
  ) {
    return this.knowledgeProductFairBaselineService.update(
      +id,
      updateKnowledgeProductFairBaselineDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.knowledgeProductFairBaselineService.remove(+id);
  }
}
