import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { KnowledgeProductFairBaseline } from './entities/knowledge_product_fair_baseline.entity';

@Injectable()
export class KnowledgeProductFairBaselineRepository extends Repository<KnowledgeProductFairBaseline> {
  constructor(private dataSource: DataSource) {
    super(KnowledgeProductFairBaseline, dataSource.createEntityManager());
  }
}
