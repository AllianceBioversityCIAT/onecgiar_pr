import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClarisaCenter } from '../../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { Version } from '../../../versioning/entities/version.entity';

@Entity('results_center')
export class ResultsCenter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'is_primary',
    type: 'boolean',
    nullable: false,
  })
  is_primary: boolean;

  @ManyToOne(() => ClarisaCenter, (cc) => cc.code)
  @JoinColumn({
    name: 'center_id',
  })
  center_id: string;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  result_id: number;

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

  @Column({
    name: 'version_id',
    type: 'bigint',
    nullable: true,
  })
  version_id: number;

  @ManyToOne(() => Version, (v) => v.results_center)
  @JoinColumn({
    name: 'version_id',
  })
  obj_version: Version;
}
