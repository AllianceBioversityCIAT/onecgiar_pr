import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { TocResult } from '../../../../toc/toc-results/entities/toc-result.entity';
import { ClarisaActionAreaOutcome } from '../../../../clarisa/clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';
import { RequestStatus } from './request-status.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('share_result_request')
export class ShareResultRequest {
  @PrimaryGeneratedColumn({
    name: 'share_result_request_id',
  })
  share_result_request_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'result_id',
  })
  result_id: number;

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, { nullable: false })
  @JoinColumn({
    name: 'owner_initiative_id',
  })
  owner_initiative_id: number;

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, { nullable: true })
  @JoinColumn({
    name: 'requester_initiative_id',
  })
  requester_initiative_id!: number;

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, { nullable: false })
  @JoinColumn({
    name: 'shared_inititiative_id',
  })
  shared_inititiative_id: number;

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, { nullable: false })
  @JoinColumn({
    name: 'approving_inititiative_id',
  })
  approving_inititiative_id: number;

  @Column({
    name: 'toc_result_id',
    type: 'int',
    nullable: true,
  })
  toc_result_id!: number;

  @ManyToOne(() => ClarisaActionAreaOutcome, (caao) => caao.id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'action_area_outcome_id',
  })
  action_area_outcome_id!: number;

  @ManyToOne(() => RequestStatus, (re) => re.request_status_id, {
    nullable: false,
  })
  @JoinColumn({
    name: 'request_status_id',
  })
  request_status_id: number;

  @Column({
    name: 'planned_result',
    type: 'boolean',
    nullable: true,
  })
  planned_result!: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'requested_by',
  })
  requested_by: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'requested_date',
  })
  requested_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'approved_by',
  })
  approved_by!: number;

  @Column({
    name: 'aprovaed_date',
    type: 'timestamp',
    nullable: true,
  })
  aprovaed_date!: Date;
}
