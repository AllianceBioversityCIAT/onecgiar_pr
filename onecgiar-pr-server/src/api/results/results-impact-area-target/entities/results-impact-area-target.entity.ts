import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { ClarisaGlobalTarget } from '../../../../clarisa/clarisa-global-target/entities/clarisa-global-target.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('results_impact_area_target')
export class ResultsImpactAreaTarget {
  @PrimaryGeneratedColumn({
    name: 'result_impact_area_target_id',
  })
  result_impact_area_target_id: number;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  result_id: number;

  @ManyToOne(() => ClarisaGlobalTarget, (cgt) => cgt.targetId)
  @JoinColumn({
    name: 'impact_area_target_id',
  })
  impact_area_target_id: number;

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
