import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductMetadata } from '../entities/results-knowledge-product-metadata.entity';

@Injectable()
export class ResultsKnowledgeProductMetadataRepository extends Repository<ResultsKnowledgeProductMetadata> {
  constructor(private dataSource: DataSource) {
    super(ResultsKnowledgeProductMetadata, dataSource.createEntityManager());
  }
}
