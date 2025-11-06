import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../results/entities/result.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { AiReviewProposal } from './ai-review-proposal.entity';

export enum ResultFieldAiStateFieldName {
  TITLE = 'title',
  DESCRIPTION = 'description',
  SHORT_TITLE = 'short_title',
}

export enum ResultFieldAiStateStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('result_field_ai_state')
@Index('IDX_result_field_ai_state_result_field', ['result_id', 'field_name'], {
  unique: true,
})
@Index('IDX_result_field_ai_state_user', ['last_updated_by'])
@Index('IDX_result_field_ai_state_proposal', ['last_ai_proposal_id'])
export class ResultFieldAiState {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'result_id', type: 'bigint', nullable: false })
  result_id: number;

  @Column({
    name: 'field_name',
    type: 'enum',
    enum: ResultFieldAiStateFieldName,
    nullable: false,
  })
  field_name: ResultFieldAiStateFieldName;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ResultFieldAiStateStatus,
    default: ResultFieldAiStateStatus.PENDING,
  })
  status: ResultFieldAiStateStatus;

  @Column({
    name: 'ai_suggestion',
    type: 'longtext',
    collation: 'utf8mb3_unicode_ci',
    nullable: true,
  })
  ai_suggestion: string;

  @Column({
    name: 'user_feedback',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  user_feedback: string;

  @Column({ name: 'last_updated_by', type: 'int', nullable: true })
  last_updated_by: number;

  @Column({ name: 'last_ai_proposal_id', type: 'bigint', nullable: true })
  last_ai_proposal_id: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    nullable: false,
  })
  created_at: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    nullable: false,
  })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Result, (result) => result.obj_result_field_ai_states)
  @JoinColumn({ name: 'result_id' })
  obj_result: Result;

  @ManyToOne(() => User, (user) => user.obj_result_field_ai_states_updated)
  @JoinColumn({ name: 'last_updated_by' })
  obj_last_updated_by: User;

  @ManyToOne(() => AiReviewProposal, (proposal) => proposal.obj_ai_states)
  @JoinColumn({ name: 'last_ai_proposal_id' })
  obj_last_ai_proposal: AiReviewProposal;
}
