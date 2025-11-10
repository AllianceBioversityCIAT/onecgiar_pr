import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ResultsInnovationsUse } from '../../../results/summary/entities/results-innovations-use.entity';
import { ResultsInnovationsDev } from '../../../results/summary/entities/results-innovations-dev.entity';

@Entity('result_scaling_study_urls')
export class ResultScalingStudyUrl {
  @PrimaryGeneratedColumn({
    name: 'id',
  })
  id: number;

  @Column({
    name: 'result_innov_use_id',
    type: 'bigint',
    nullable: true,
  })
  result_innov_use_id!: number;

  @Column({
    name: 'result_innov_dev_id',
    type: 'bigint',
    nullable: true,
  })
  result_innov_dev_id!: number;

  @ManyToOne(() => ResultsInnovationsDev, {
    nullable: false,
  })
  @JoinColumn({
    name: 'result_innov_dev_id',
  })
  obj_result_innov_dev: ResultsInnovationsDev;

  @Column({
    name: 'study_url',
    type: 'text',
    nullable: false,
  })
  study_url: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => ResultsInnovationsUse, {
    nullable: false,
  })
  @JoinColumn({
    name: 'result_innov_use_id',
  })
  obj_result_innov_use: ResultsInnovationsUse;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @Column({
    name: 'created_by',
    type: 'int',
    nullable: false,
  })
  created_by!: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  created_by_user!: User;

  @Column({
    name: 'last_updated_by',
    type: 'int',
    nullable: true,
  })
  last_updated_by!: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'last_updated_by' })
  last_updated_by_user?: User;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;
}
