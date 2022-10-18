import { User } from '../../../../auth/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Version } from '../../versions/entities/version.entity';
import { Result } from '../../entities/result.entity';

@Entity()
export class ResultsByInstitution {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'result_id',
  })
  result_id: number;

  @Column({
    name: 'institutions_id',
    type: 'int',
    nullable: false,
  })
  institutions_id: number;

  @Column({
    name: 'institution_roles_id',
    type: 'bigint',
    nullable: false,
  })
  institution_roles_id: number;

  // @ManyToOne(() => Institution, i => i.id, { nullable: false })
  // @JoinColumn({ name: 'institution_roles_id' })
  // institution_roles_id: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => Version, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'version_id',
  })
  version_id: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    type: 'timestamp',
    nullable: false,
  })
  created_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    nullable: true,
    type: 'timestamp',
  })
  last_updated_date!: Date;
}
