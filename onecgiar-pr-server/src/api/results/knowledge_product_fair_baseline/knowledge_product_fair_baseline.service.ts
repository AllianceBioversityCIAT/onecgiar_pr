import { Injectable } from '@nestjs/common';
import { CreateKnowledgeProductFairBaselineDto } from './dto/create-knowledge_product_fair_baseline.dto';
import { UpdateKnowledgeProductFairBaselineDto } from './dto/update-knowledge_product_fair_baseline.dto';

@Injectable()
export class KnowledgeProductFairBaselineService {
  create(createKnowledgeProductFairBaselineDto: CreateKnowledgeProductFairBaselineDto) {
    return 'This action adds a new knowledgeProductFairBaseline';
  }

  findAll() {
    return `This action returns all knowledgeProductFairBaseline`;
  }

  findOne(id: number) {
    return `This action returns a #${id} knowledgeProductFairBaseline`;
  }

  update(id: number, updateKnowledgeProductFairBaselineDto: UpdateKnowledgeProductFairBaselineDto) {
    return `This action updates a #${id} knowledgeProductFairBaseline`;
  }

  remove(id: number) {
    return `This action removes a #${id} knowledgeProductFairBaseline`;
  }
}
