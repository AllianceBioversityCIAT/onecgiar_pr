import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaPortfolios } from './entities/clarisa-portfolios.entity';

@Injectable()
export class ClarisaPortfoliosRepository extends Repository<ClarisaPortfolios> {
  constructor(private dataSource: DataSource) {
    super(ClarisaPortfolios, dataSource.createEntityManager());
  }
}
