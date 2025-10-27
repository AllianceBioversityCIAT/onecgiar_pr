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
import { ClarisaInnovationReadinessLevel } from '../../../../clarisa/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';

@Entity('results_innovations_use')
export class ResultsInnovationsUse {
  @PrimaryGeneratedColumn({
    name: 'result_innovation_use_id',
  })
  result_innovation_use_id: number;

  @OneToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'results_id',
  })
  results_id: number;

  @Column({
    name: 'male_using',
    type: 'bigint',
    nullable: true,
  })
  male_using!: number;

  @Column({
    name: 'female_using',
    type: 'bigint',
    nullable: true,
  })
  female_using!: number;

  @Column({
    name: 'has_innovation_link',
    type: 'tinyint',
    nullable: true,
  })
  has_innovation_link: boolean;

  @Column({
    name: 'has_scaling_studies',
    type: 'tinyint',
    nullable: true,
  })
  has_scaling_studies: boolean;

  @Column({
    name: 'readiness_level_explanation',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  readiness_level_explanation: string;

  @Column({
    name: 'innovation_readiness_level_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_readiness_level_id!: number;

  @ManyToOne(() => ClarisaInnovationReadinessLevel, {
    nullable: true,
  })
  @JoinColumn({
    name: 'innovation_readiness_level_id',
  })
  obj_innovation_readiness_level?: ClarisaInnovationReadinessLevel;

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
