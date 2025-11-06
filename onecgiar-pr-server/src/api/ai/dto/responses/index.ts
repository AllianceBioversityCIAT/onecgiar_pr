import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the session',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID of the result being reviewed',
    example: 123,
  })
  result_id: number;

  @ApiProperty({
    description: 'ID of the user who opened the session',
    example: 456,
  })
  opened_by: number;

  @ApiProperty({
    description: 'Timestamp when the session was opened',
    example: '2025-11-05T14:30:00.000Z',
  })
  opened_at: Date;

  @ApiProperty({
    description: 'Timestamp when the session was closed (null if still open)',
    example: null,
    nullable: true,
  })
  closed_at?: Date;

  @ApiProperty({
    description: 'Whether all sections were completed before closing',
    example: false,
  })
  all_sections_completed: boolean;

  @ApiProperty({
    description: 'Current status of the session',
    example: 'COMPLETED',
  })
  status: string;
}

export class ProposalResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the proposal',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID of the session this proposal belongs to',
    example: 1,
  })
  session_id: number;

  @ApiProperty({
    description: 'The field name this proposal is for',
    example: 'title',
  })
  field_name: string;

  @ApiProperty({
    description: 'The original text from the result field',
    example: 'Original title text',
    nullable: true,
  })
  original_text?: string;

  @ApiProperty({
    description: 'The improved text proposed by AI',
    example: 'Improved title text with better clarity',
    nullable: true,
  })
  proposed_text?: string;

  @ApiProperty({
    description: 'Whether the AI determined this field needs improvement',
    example: true,
    nullable: true,
  })
  needs_improvement?: boolean;

  @ApiProperty({
    description: 'Timestamp when the proposal was created',
    example: '2025-11-05T14:30:00.000Z',
  })
  created_at: Date;
}

export class EventResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the event',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID of the session this event belongs to',
    example: 1,
  })
  session_id: number;

  @ApiProperty({
    description: 'ID of the result being reviewed',
    example: 123,
  })
  result_id: number;

  @ApiProperty({
    description: 'ID of the user who performed the action',
    example: 456,
  })
  user_id: number;

  @ApiProperty({
    description: 'Type of event that occurred',
    example: 'APPLY_PROPOSAL',
  })
  event_type: string;

  @ApiProperty({
    description: 'The field name the event relates to (if applicable)',
    example: 'title',
    nullable: true,
  })
  field_name?: string;

  @ApiProperty({
    description: 'Timestamp when the event occurred',
    example: '2025-11-05T14:30:00.000Z',
  })
  created_at: Date;
}

export class FieldStateResponseDto {
  @ApiProperty({
    description: 'The field name',
    example: 'title',
  })
  field_name: string;

  @ApiProperty({
    description: 'Current AI suggestion status for this field',
    example: 'ACCEPTED',
  })
  status: string;

  @ApiProperty({
    description: 'The AI-generated suggestion text',
    example: 'Improved title text',
    nullable: true,
  })
  ai_suggestion?: string;

  @ApiProperty({
    description: 'User feedback on the AI suggestion',
    example: 'Good suggestion, very helpful',
    nullable: true,
  })
  user_feedback?: string;

  @ApiProperty({
    description: 'ID of the user who last updated this field',
    example: 456,
    nullable: true,
  })
  last_updated_by?: number;

  @ApiProperty({
    description: 'Timestamp of the last update',
    example: '2025-11-05T14:30:00.000Z',
  })
  updated_at: Date;
}

export class ResultStateResponseDto {
  @ApiProperty({
    description: 'ID of the result',
    example: 123,
  })
  result_id: number;

  @ApiProperty({
    description: 'Array of field states for this result',
    type: [FieldStateResponseDto],
  })
  fields: FieldStateResponseDto[];
}

export class UsageStatsResponseDto {
  @ApiProperty({
    description: 'ID of the result',
    example: 123,
  })
  result_id: number;

  @ApiProperty({
    description: 'Total number of AI review sessions for this result',
    example: 5,
  })
  total_sessions: number;

  @ApiProperty({
    description: 'Total number of events logged for this result',
    example: 23,
  })
  total_events: number;

  @ApiProperty({
    description: 'Breakdown of events by type',
    example: {
      APPLY_PROPOSAL: 8,
      REGENERATE: 3,
      SAVE_CHANGES: 5,
      CLOSE_MODAL: 5,
      CLICK_REVIEW: 2,
    },
  })
  events_by_type: Record<string, number>;

  @ApiProperty({
    description: 'Breakdown of events by type and field name',
    example: {
      APPLY_PROPOSAL: {
        title: 4,
        description: 3,
        short_title: 1,
      },
      SAVE_CHANGES: {
        title: 2,
        description: 3,
      },
    },
  })
  events_by_field: Record<string, Record<string, number>>;

  @ApiProperty({
    description: 'Timestamp of the most recent session',
    example: '2025-11-05T14:30:00.000Z',
    nullable: true,
  })
  last_session_at?: Date;
}
