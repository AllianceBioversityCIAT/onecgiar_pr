import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaPolicyStage } from '../../../../clarisa/clarisa-policy-stages/entities/clarisa-policy-stage.entity';
import { ClarisaPolicyType } from '../../../../clarisa/clarisa-policy-types/entities/clarisa-policy-type.entity';

@Entity('results_policy_changes')
export class ResultsPolicyChanges {
  @PrimaryGeneratedColumn({
    name: 'result_policy_change_id',
  })
  result_policy_change_id: number;

  @OneToOne(() => Result, (r) => r.results_policy_changes_object, {
    nullable: false,
  })
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false,
  })
  result_id: number;

  @ManyToOne(() => ClarisaPolicyStage, (cps) => cps.id, { nullable: true })
  @JoinColumn({
    name: 'policy_stage_id',
  })
  policy_stage_id!: number;

  @ManyToOne(() => ClarisaPolicyType, (cpt) => cpt.id, { nullable: true })
  @JoinColumn({
    name: 'policy_type_id',
  })
  policy_type_id!: number;

  @Column({
    name: 'amount',
    type: 'float',
    nullable: true,
  })
  amount!: number;

  @Column({
    name: 'status_amount',
    type: 'text',
    nullable: true,
  })
  status_amount!: string;

  @Column({
    name: 'linked_innovation_dev',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  linked_innovation_dev: boolean;

  @Column({
    name: 'linked_innovation_use',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  linked_innovation_use: boolean;

  @Column({
    name: 'result_related_engagement',
    type: 'boolean',
    nullable: true,
  })
  result_related_engagement: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;
}
