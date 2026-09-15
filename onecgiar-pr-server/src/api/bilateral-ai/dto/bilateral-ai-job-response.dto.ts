import { ApiProperty } from '@nestjs/swagger';

/**
 * Documents the payload of `GET /api/bilateral/center/ai/jobs/:jobId` after `APF-T-2`
 * (`design.md` §4.1, `requirements.md` `APF-R-1`). Not wired into the controller yet — `getJob`
 * still returns the entity plus the two computed fields directly (`bilateral-ai.service.ts`); this
 * class is the documented shape for the bilateral contract change log and for `APF-T-3`/later
 * client tasks to read against. Additive only — every field below existed before this task except
 * `stage`, `stage_updated_date`, `queue_position`, `max_attempts`, and `retrying`.
 */
export class BilateralAiJobResponseDto {
  @ApiProperty({ description: 'Job id (UUID)', example: 'a1b2c3d4-...' })
  job_id: string;

  @ApiProperty({ description: 'Id of the user who created the job' })
  user_id: number;

  @ApiProperty({ description: 'CLARISA institution id of the centre' })
  center_id: number;

  @ApiProperty({ description: 'Project id the job was created under' })
  project_id: number;

  @ApiProperty({ description: 'Bilateral programme code' })
  program_code: string;

  @ApiProperty({ description: 'S3 bucket holding the uploaded sources' })
  bucket_name: string;

  @ApiProperty({
    description: 'S3 keys of uploaded documents',
    type: [String],
    nullable: true,
  })
  document_keys: string[] | null;

  @ApiProperty({
    description: 'S3 keys of uploaded audio files',
    type: [String],
    nullable: true,
  })
  audio_keys: string[] | null;

  @ApiProperty({
    description: 'Free-text context supplied at upload',
    nullable: true,
  })
  text_context: string | null;

  @ApiProperty({
    description: 'PENDING | PROCESSING | COMPLETED | FAILED',
    example: 'PROCESSING',
  })
  status: string;

  @ApiProperty({
    description:
      'PRMS-controlled step inside PROCESSING. One of the 8 server values documented in ' +
      'design.md §3.1: queued, uploading, reading, transcribing, reading_transcribing, ' +
      'extracting, validating, creating_drafts.',
    example: 'extracting',
  })
  stage: string;

  @ApiProperty({
    description: 'When `stage` was last set',
    nullable: true,
  })
  stage_updated_date: Date | null;

  @ApiProperty({
    description:
      'Set while a retryable failure is being requeued mid-job; the job stays PROCESSING ' +
      'instead of bouncing through FAILED (APF-DD-3).',
  })
  retrying: boolean;

  @ApiProperty({ description: 'Number of attempts consumed so far' })
  attempts: number;

  @ApiProperty({
    description:
      'Max attempts before the job is terminally FAILED (BILATERAL_AI_MAX_ATTEMPTS, default 3).',
    example: 3,
  })
  max_attempts: number;

  @ApiProperty({
    description:
      'Count, computed at read time, of non-terminal jobs (PENDING/PROCESSING) whose ' +
      "queue-entry clock is older than this job's. Only meaningful while this job is PENDING — " +
      'null otherwise. Never stored (APF-R-1 A).',
    nullable: true,
    example: 2,
  })
  queue_position: number | null;

  @ApiProperty({
    description: 'Error code of the last failed attempt, if any',
    nullable: true,
  })
  error_code: string | null;

  @ApiProperty({
    description: 'Error message of the last failed attempt, if any',
    nullable: true,
  })
  error_message: string | null;

  @ApiProperty({ nullable: true })
  external_interaction_id: string | null;

  @ApiProperty({ nullable: true })
  response_snapshot: Record<string, unknown> | null;

  @ApiProperty({ description: 'Number of draft results produced' })
  result_count: number;

  @ApiProperty()
  created_date: Date;

  @ApiProperty({ nullable: true })
  started_date: Date | null;

  @ApiProperty({ nullable: true })
  completed_date: Date | null;

  @ApiProperty({
    nullable: true,
    description:
      'Set by the retry endpoint (APF-R-5); moves the queue-entry clock to the retry moment.',
  })
  retried_date: Date | null;

  @ApiProperty()
  last_updated_date: Date;
}
