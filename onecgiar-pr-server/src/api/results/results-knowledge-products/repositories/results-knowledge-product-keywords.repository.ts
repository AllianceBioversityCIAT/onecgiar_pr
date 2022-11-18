import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductKeyword } from '../entities/results-knowledge-product-keywords.entity';

@Injectable()
export class ResultsKnowledgeProductKeywordRepository extends Repository<ResultsKnowledgeProductKeyword> {
  constructor(private dataSource: DataSource) {
    super(ResultsKnowledgeProductKeyword, dataSource.createEntityManager());
  }
}
