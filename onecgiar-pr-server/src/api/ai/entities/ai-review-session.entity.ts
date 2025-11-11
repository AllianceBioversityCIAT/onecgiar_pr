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
import { Result } from '../../results/entities/result.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { AiReviewProposal } from './ai-review-proposal.entity';
import { AiReviewEvent } from './ai-review-event.entity';

export enum AiReviewSessionStatus {
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

@Entity('ai_review_session')
@Index('IDX_ai_review_session_result', ['result_id'])
export class AiReviewSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'result_id', type: 'bigint', nullable: false })
  result_id: number;

  @Column({ name: 'opened_by', type: 'int', nullable: false })
  opened_by: number;

  @CreateDateColumn({
    name: 'opened_at',
    type: 'timestamp',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    nullable: false,
  })
  opened_at: Date;

  @Column({
    name: 'closed_at',
    type: 'timestamp',
    precision: 6,
    nullable: true,
  })
  closed_at: Date;

  @Column({
    name: 'all_sections_completed',
    type: 'tinyint',
    nullable: false,
    default: 0,
  })
  all_sections_completed: boolean;

  @Column({
    name: 'request_payload',
    type: 'json',
    nullable: true,
  })
  request_payload: any;

  @Column({
    name: 'response_payload',
    type: 'json',
    nullable: true,
  })
  response_payload: any;

  @Column({
    name: 'status',
    type: 'enum',
    enum: AiReviewSessionStatus,
    default: AiReviewSessionStatus.COMPLETED,
  })
  status: AiReviewSessionStatus;

  // Relations
  @ManyToOne(() => Result, (result) => result.obj_ai_review_sessions)
  @JoinColumn({ name: 'result_id' })
  obj_result: Result;

  @ManyToOne(() => User, (user) => user.obj_ai_review_sessions_opened)
  @JoinColumn({ name: 'opened_by' })
  obj_opened_by: User;

  @OneToMany(() => AiReviewProposal, (proposal) => proposal.obj_session)
  obj_proposals: AiReviewProposal[];

  @OneToMany(() => AiReviewEvent, (event) => event.obj_session)
  obj_events: AiReviewEvent[];
}
