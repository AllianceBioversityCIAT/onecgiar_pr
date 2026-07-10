import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiReviewSession } from './ai-review-session.entity';
import { ResultFieldRevision } from './result-field-revision.entity';
import { ResultFieldAiState } from './result-field-ai-state.entity';
import { DacFieldName } from '../constants/dac-field-name.enum';

export enum AiReviewProposalFieldName {
  TITLE = 'title',
  DESCRIPTION = 'description',
  SHORT_TITLE = 'short_title',
  GENDER = DacFieldName.GENDER,
  CLIMATE = DacFieldName.CLIMATE,
  NUTRITION = DacFieldName.NUTRITION,
  ENVIRONMENTAL = DacFieldName.ENVIRONMENTAL,
  POVERTY = DacFieldName.POVERTY,
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

  @OneToMany(() => ResultFieldRevision, (revision) => revision.obj_proposal)
  obj_revisions: ResultFieldRevision[];

  @OneToMany(
    () => ResultFieldAiState,
    (aiState) => aiState.obj_last_ai_proposal,
  )
  obj_ai_states: ResultFieldAiState[];
}
