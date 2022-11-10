import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsKnowledgeProductInstitution } from '../entities/results-knowledge-product-institution.entity';

@Injectable()
export class ResultsKnowledgeProductInstitutionRepository extends Repository<ResultsKnowledgeProductInstitution> {
  constructor(private dataSource: DataSource) {
    super(ResultsKnowledgeProductInstitution, dataSource.createEntityManager());
  }
}
