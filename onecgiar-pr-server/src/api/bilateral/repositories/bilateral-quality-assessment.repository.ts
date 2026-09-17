import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BilateralQualityAssessment } from '../entities/bilateral-quality-assessment.entity';

/**
 * Thin data access for `bilateral_quality_assessments`
 * (`design.md` §3.1, `BIL-QAI-T-2`).
 *
 * Deliberately thin: the running-row lock SQL (find-or-claim a young
 * `running` row before starting a new assessment) belongs to `T-6`, not
 * here. This repository only exposes the read every caller of the latest
 * assessment needs.
 */
@Injectable()
export class BilateralQualityAssessmentRepository extends Repository<BilateralQualityAssessment> {
  constructor(private readonly dataSource: DataSource) {
    super(BilateralQualityAssessment, dataSource.createEntityManager());
  }

  /**
   * The most recent assessment row for a result, or null when none exists.
   * Ordered by `created_at DESC, id DESC` so a tie on the same millisecond
   * (`datetime` has no sub-second precision) still resolves to the
   * last-inserted row.
   */
  async findLatestByResultId(
    resultId: number,
  ): Promise<BilateralQualityAssessment | null> {
    return this.findOne({
      where: { result_id: resultId },
      order: { created_at: 'DESC', id: 'DESC' },
    });
  }
}
