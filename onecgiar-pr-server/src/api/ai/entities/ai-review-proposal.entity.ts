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

export enum AiReviewProposalFieldName {
  TITLE = 'title',
  DESCRIPTION = 'description',
  SHORT_TITLE = 'short_title',
}

@Entity('ai_review_proposal')
@Index('IDX_ai_review_proposal_session_field', ['session_id', 'field_name'])
export class AiReviewProposal {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'session_id', type: 'bigint', nullable: false })
  session_id: number;

  @Column({
    name: 'field_name',
    type: 'enum',
    enum: AiReviewProposalFieldName,
    nullable: false,
  })
  field_name: AiReviewProposalFieldName;

  @Column({
    name: 'original_text',
    type: 'longtext',
    collation: 'utf8mb3_unicode_ci',
    nullable: true,
  })
  original_text: string;

  @Column({
    name: 'proposed_text',
    type: 'longtext',
    collation: 'utf8mb3_unicode_ci',
    nullable: true,
  })
  proposed_text: string;

  @Column({
    name: 'needs_improvement',
    type: 'tinyint',
    nullable: true,
  })
  needs_improvement: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    nullable: false,
  })
  created_at: Date;

  // Relations
  @ManyToOne(() => AiReviewSession, (session) => session.obj_proposals)
  @JoinColumn({ name: 'session_id' })
  obj_session: AiReviewSession;
}
