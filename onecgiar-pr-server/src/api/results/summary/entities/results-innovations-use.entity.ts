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
import { ClarisaInnovationUseLevel } from '../../../../clarisa/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity';

@Entity('results_innovations_use')
export class ResultsInnovationsUse {
  @PrimaryGeneratedColumn({
    name: 'result_innovation_use_id',
  })
  result_innovation_use_id: number;

  @OneToOne(() => Result, (r) => r.results_innovations_use_object, {
    nullable: false,
  })
  @JoinColumn({
    name: 'results_id',
  })
  obj_result: Result;

  @Column({
    name: 'results_id',
    type: 'bigint',
    nullable: false,
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
    type: 'text',
    nullable: true,
  })
  readiness_level_explanation: string;

  @Column({
    name: 'innov_use_to_be_determined',
    type: 'tinyint',
    nullable: true,
  })
  innov_use_to_be_determined: boolean;

  @Column({
    name: 'innov_use_2030_to_be_determined',
    type: 'tinyint',
    nullable: true,
  })
  innov_use_2030_to_be_determined: boolean;

  @Column({
    name: 'innovation_use_level_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_use_level_id!: number;

  @ManyToOne(() => ClarisaInnovationUseLevel, {
    nullable: true,
  })
  @JoinColumn({
    name: 'innovation_use_level_id',
  })
  obj_innovation_use_level?: ClarisaInnovationUseLevel;

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
