import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductAuthor } from '../entities/results-knowledge-product-authors.entity';

@Injectable()
export class ResultsKnowledgeProductAuthorRepository extends Repository<ResultsKnowledgeProductAuthor> {
  constructor(private dataSource: DataSource) {
    super(ResultsKnowledgeProductAuthor, dataSource.createEntityManager());
  }
}
