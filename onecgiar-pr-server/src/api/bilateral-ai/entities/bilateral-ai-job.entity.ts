import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BilateralAiJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('bilateral_ai_jobs')
export class BilateralAiJob {
  @PrimaryColumn({ name: 'job_id', type: 'varchar', length: 36 })
  job_id: string;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ name: 'center_id', type: 'int' })
  center_id: number;

  @Column({ name: 'project_id', type: 'int' })
  project_id: number;

  @Column({ name: 'program_code', type: 'varchar', length: 100 })
  program_code: string;

  @Column({ name: 'bucket_name', type: 'varchar', length: 255 })
  bucket_name: string;

  @Column({ name: 'document_keys', type: 'json', nullable: true })
  document_keys: string[];

  @Column({ name: 'audio_keys', type: 'json', nullable: true })
  audio_keys: string[];

  @Column({ name: 'text_context', type: 'text', nullable: true })
  text_context: string | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: BilateralAiJobStatus.PENDING,
  })
  status: BilateralAiJobStatus;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @Column({
    name: 'external_interaction_id',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  external_interaction_id: string | null;

  @Column({ name: 'response_snapshot', type: 'json', nullable: true })
  response_snapshot: Record<string, unknown> | null;

  @Column({ name: 'result_count', type: 'int', default: 0 })
  result_count: number;

  @Column({ name: 'error_code', type: 'varchar', length: 50, nullable: true })
  error_code: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({ name: 'created_date', type: 'timestamp' })
  created_date: Date;

  @Column({ name: 'started_date', type: 'timestamp', nullable: true })
  started_date: Date | null;

  @Column({ name: 'completed_date', type: 'timestamp', nullable: true })
  completed_date: Date | null;

  @UpdateDateColumn({ name: 'last_updated_date', type: 'timestamp' })
  last_updated_date: Date;
}
