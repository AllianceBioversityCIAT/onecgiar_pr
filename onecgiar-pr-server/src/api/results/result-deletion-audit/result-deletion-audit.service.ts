import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultDeletionAudit } from './entities/result-deletion-audit.entity';
import { ResultDeletionAuditSource } from './result-deletion-audit-source.enum';

@Injectable()
export class ResultDeletionAuditService {
  constructor(
    @InjectRepository(ResultDeletionAudit)
    private readonly repository: Repository<ResultDeletionAudit>,
  ) {}

  async recordDeletion(params: {
    resultId: number;
    userId: number;
    deletionSource: ResultDeletionAuditSource;
    justification?: string | null;
  }): Promise<void> {
    const justification =
      params.justification?.trim().length > 0
        ? params.justification.trim()
        : null;

    const row = this.repository.create({
      result_id: params.resultId,
      deleted_by_user_id: params.userId,
      created_by: params.userId,
      last_updated_by: params.userId,
      justification,
      deletion_source: params.deletionSource,
    });

    await this.repository.save(row);
  }
}
