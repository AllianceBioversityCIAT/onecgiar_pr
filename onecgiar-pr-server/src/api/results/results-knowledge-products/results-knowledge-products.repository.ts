import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsKnowledgeProduct } from './entities/results-knowledge-product.entity';

@Injectable()
export class ResultsKnowledgeProductsRepository extends Repository<ResultsKnowledgeProduct> {
  constructor(private dataSource: DataSource) {
    super(ResultsKnowledgeProduct, dataSource.createEntityManager());
  }
}
