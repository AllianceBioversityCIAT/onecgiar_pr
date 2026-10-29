// @akili-spec quality-assurance/qa-intake
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Result } from '../../results/entities/result.entity';

/**
 * QIN-T-1 — append-only audit of QA intake/release actions (design.md §5,
 * QIN-DD-6). Stores the calling platform, never a person or a key.
 * `created_date` uses the DB clock (CURRENT_TIMESTAMP); declared as a plain
 * timestamp column (not @CreateDateColumn, whose precision-6 default would
 * mismatch a CURRENT_TIMESTAMP default and fail with ER_INVALID_DEFAULT).
 */
@Entity('result_qa_intake_log')
@Index('idx_result_qa_intake_log_result_id', ['result_id'])
export class ResultQaIntakeLog {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'result_id', type: 'bigint', nullable: false })
  result_id: number;

  @ManyToOne(() => Result, { nullable: false })
  @JoinColumn({ name: 'result_id' })
  obj_result: Result;

  /** `intake` | `release_qaed` | `release_not_qaed` */
  @Column({ name: 'action', type: 'varchar', length: 20, nullable: false })
  action: string;

  @Column({ name: 'phase_year', type: 'int', nullable: false })
  phase_year: number;

  @Column({ name: 'platform_id', type: 'int', nullable: false })
  platform_id: number;

  @Column({
    name: 'platform_acronym',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  platform_acronym: string;

  @Column({
    name: 'created_date',
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_date: Date;
}
