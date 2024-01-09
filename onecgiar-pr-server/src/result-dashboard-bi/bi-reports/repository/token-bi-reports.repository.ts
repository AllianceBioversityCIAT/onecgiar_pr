import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TokenBiReport } from '../entities/token-bi-reports.entity';

@Injectable()
export class TokenBiReportRepository extends Repository<TokenBiReport> {
  constructor(private dataSource: DataSource) {
    super(TokenBiReport, dataSource.createEntityManager());
  }
}
