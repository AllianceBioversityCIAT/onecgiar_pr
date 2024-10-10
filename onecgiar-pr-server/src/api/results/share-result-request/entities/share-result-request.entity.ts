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
import { ClarisaActionAreaOutcome } from '../../../../clarisa/clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';
import { RequestStatus } from './request-status.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('share_result_request')
export class ShareResultRequest {
  @PrimaryGeneratedColumn({
    name: 'share_result_request_id',
  })
  share_result_request_id: number;

  @Column({
    name: 'result_id',
    type: 'int',
    nullable: false,
  })
  result_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result[];

  @Column({
    name: 'owner_initiative_id',
    type: 'int',
    nullable: false,
  })
  owner_initiative_id: number;

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, { nullable: false })
  @JoinColumn({
    name: 'owner_initiative_id',
  })
  obj_owner_initiative: ClarisaInitiative[];

  @Column({
    name: 'requester_initiative_id',
    type: 'int',
    nullable: true,
  })
  requester_initiative_id!: number;

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, { nullable: true })
  @JoinColumn({
    name: 'requester_initiative_id',
  })
  obj_requester_initiative!: ClarisaInitiative[];

  @Column({
    name: 'shared_inititiative_id',
    type: 'int',
    nullable: false,
  })
  shared_inititiative_id: number;

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, { nullable: false })
  @JoinColumn({
    name: 'shared_inititiative_id',
  })
  obj_shared_inititiative: ClarisaInitiative[];

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

  @Column({
    name: 'request_status_id',
    type: 'int',
    nullable: false,
  })
  request_status_id: number;

  @ManyToOne(() => RequestStatus, (re) => re.request_status_id, {
    nullable: false,
  })
  @JoinColumn({
    name: 'request_status_id',
  })
  obj_request_status: RequestStatus[];

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

  @Column({
    name: 'requested_by',
    type: 'int',
    nullable: false,
  })
  requested_by: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'requested_by',
  })
  obj_requested_by: User[];

  @CreateDateColumn({
    type: 'timestamp',
    name: 'requested_date',
  })
  requested_date: Date;

  @Column({
    name: 'approved_by',
    type: 'int',
    nullable: true,
  })
  approved_by!: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'approved_by',
  })
  obj_approved_by!: User[];

  @Column({
    name: 'aprovaed_date',
    type: 'timestamp',
    nullable: true,
  })
  aprovaed_date!: Date;

  @Column({
    name: 'is_map_to_toc',
    type: 'boolean',
    nullable: true,
    default: false,
  })
  is_map_to_toc: boolean;
}
