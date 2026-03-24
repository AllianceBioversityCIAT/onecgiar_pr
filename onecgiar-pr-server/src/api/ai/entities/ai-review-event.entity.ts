import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiReviewSession } from './ai-review-session.entity';
import { Result } from '../../results/entities/result.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';

export enum AiReviewEventFieldName {
  TITLE = 'title',
  DESCRIPTION = 'description',
  SHORT_TITLE = 'short_title',
}

export enum AiReviewEventType {
  CLICK_REVIEW = 'CLICK_REVIEW',
  APPLY_PROPOSAL = 'APPLY_PROPOSAL',
  SAVE_CHANGES = 'SAVE_CHANGES',
  CLOSE_MODAL = 'CLOSE_MODAL',
  REGENERATE = 'REGENERATE',
}

@Entity('ai_review_event')
@Index('IDX_ai_review_event_session', ['session_id'])
@Index('IDX_ai_review_event_result', ['result_id'])
@Index('IDX_ai_review_event_evt_field', ['event_type', 'field_name'])
export class AiReviewEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'session_id', type: 'bigint', nullable: false })
  session_id: number;

  @Column({ name: 'result_id', type: 'bigint', nullable: false })
  result_id: number;

  @Column({ name: 'user_id', type: 'int', nullable: false })
  user_id: number;

  @Column({
    name: 'field_name',
    type: 'enum',
    enum: AiReviewEventFieldName,
    nullable: true,
  })
  field_name: AiReviewEventFieldName;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: AiReviewEventType,
    nullable: false,
  })
  event_type: AiReviewEventType;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    nullable: false,
  })
  created_at: Date;

  // Relations
  @ManyToOne(() => AiReviewSession, (session) => session.obj_events)
  @JoinColumn({ name: 'session_id' })
  obj_session: AiReviewSession;

  @ManyToOne(() => Result, (result) => result.obj_ai_review_events)
  @JoinColumn({ name: 'result_id' })
  obj_result: Result;

  @ManyToOne(() => User, (user) => user.obj_ai_review_events)
  @JoinColumn({ name: 'user_id' })
  obj_user: User;
}
