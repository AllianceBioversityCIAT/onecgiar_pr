import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../results/entities/result.entity';
import { BilateralAiJob } from './bilateral-ai-job.entity';

@Entity('bilateral_ai_drafts')
export class BilateralAiDraft {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'job_id', type: 'varchar', length: 36 })
  job_id: string;

  @ManyToOne(() => BilateralAiJob, { nullable: false })
  @JoinColumn({ name: 'job_id', referencedColumnName: 'job_id' })
  job: BilateralAiJob;

  @Column({ name: 'result_id', type: 'bigint', unique: true })
  result_id: number;

  @ManyToOne(() => Result, { nullable: false })
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @Column({ name: 'candidate_index', type: 'int' })
  candidate_index: number;

  @Column({ name: 'extracted_mds', type: 'json', nullable: true })
  extracted_mds: Record<string, unknown> | null;

  @Column({ name: 'candidate_snapshot', type: 'json', nullable: true })
  candidate_snapshot: Record<string, unknown> | null;

  @Column({ name: 'mapping_warnings', type: 'json', nullable: true })
  mapping_warnings: string[] | null;

  @Column({ name: 'is_discarded', type: 'boolean', default: false })
  is_discarded: boolean;

  @CreateDateColumn({ name: 'created_date', type: 'timestamp' })
  created_date: Date;

  @UpdateDateColumn({ name: 'last_updated_date', type: 'timestamp' })
  last_updated_date: Date;
}
