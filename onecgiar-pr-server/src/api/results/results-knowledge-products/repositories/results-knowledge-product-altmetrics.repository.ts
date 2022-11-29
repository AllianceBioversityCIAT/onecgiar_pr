import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductAltmetric } from '../entities/results-knowledge-product-altmetrics.entity';

@Injectable()
export class ResultsKnowledgeProductAltmetricRepository extends Repository<ResultsKnowledgeProductAltmetric> {
  constructor(private dataSource: DataSource) {
    super(ResultsKnowledgeProductAltmetric, dataSource.createEntityManager());
  }
}
