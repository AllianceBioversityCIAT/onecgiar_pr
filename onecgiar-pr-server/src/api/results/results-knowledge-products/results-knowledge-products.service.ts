import { Injectable } from '@nestjs/common';
import { CreateResultsKnowledgeProductDto } from './dto/create-results-knowledge-product.dto';
import { UpdateResultsKnowledgeProductDto } from './dto/update-results-knowledge-product.dto';

@Injectable()
export class ResultsKnowledgeProductsService {
  create(createResultsKnowledgeProductDto: CreateResultsKnowledgeProductDto) {
    return 'This action adds a new resultsKnowledgeProduct';
  }

  findAll() {
    return `This action returns all resultsKnowledgeProducts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsKnowledgeProduct`;
  }

  update(id: number, updateResultsKnowledgeProductDto: UpdateResultsKnowledgeProductDto) {
    return `This action updates a #${id} resultsKnowledgeProduct`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsKnowledgeProduct`;
  }
}
