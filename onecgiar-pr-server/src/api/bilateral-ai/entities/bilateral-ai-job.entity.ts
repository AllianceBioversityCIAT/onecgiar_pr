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

  /**
   * PRMS-controlled step inside `status = PROCESSING` (`APF-R-1` B, `design.md` §3.1). One of the
   * 8 server values: `queued` · `uploading` · `reading` · `transcribing` · `reading_transcribing`
   * · `extracting` · `validating` · `creating_drafts`. `varchar(32)` because the longest value,
   * `reading_transcribing`, is 20 chars.
   */
  @Column({
    name: 'stage',
    type: 'varchar',
    length: 32,
    default: 'queued',
  })
  stage: string;

  @Column({ name: 'stage_updated_date', type: 'timestamp', nullable: true })
  stage_updated_date: Date | null;

  /**
   * Set while a retryable failure is being requeued mid-job (`APF-DD-3`): the job stays
   * `PROCESSING` instead of bouncing through `FAILED`. Cleared by the next attempt-start
   * statement (`design.md` §5 "Attempt start").
   */
  @Column({ name: 'retrying', type: 'boolean', default: false })
  retrying: boolean;

  /**
   * Set by `retryJob` ("Try again", `APF-R-5`) to the retry moment; `created_date` is left
   * untouched so the original upload time stays readable for provenance. Feeds `queue_entry_date`
   * below.
   */
  @Column({ name: 'retried_date', type: 'timestamp', nullable: true })
  retried_date: Date | null;

  @CreateDateColumn({ name: 'created_date', type: 'timestamp' })
  created_date: Date;

  @Column({ name: 'started_date', type: 'timestamp', nullable: true })
  started_date: Date | null;

  @Column({ name: 'completed_date', type: 'timestamp', nullable: true })
  completed_date: Date | null;

  @UpdateDateColumn({ name: 'last_updated_date', type: 'timestamp' })
  last_updated_date: Date;

  /**
   * `queue_entry_date = COALESCE(retried_date, created_date)` — the moment the job entered the
   * queue in its current life (`design.md` §3.1 "Queue-entry clock"). STORED generated column
   * (M1) so the sweeper's stall scan and `queue_position` ordering can use it through
   * `IDX_bilateral_ai_jobs_status_queue_entry`. Read-only: TypeORM never writes this column
   * (`insert: false, update: false`) — MySQL computes it.
   */
  @Column({
    name: 'queue_entry_date',
    type: 'datetime',
    generatedType: 'STORED',
    asExpression: 'COALESCE(`retried_date`, `created_date`)',
    insert: false,
    update: false,
    nullable: true,
  })
  queue_entry_date: Date;
}
