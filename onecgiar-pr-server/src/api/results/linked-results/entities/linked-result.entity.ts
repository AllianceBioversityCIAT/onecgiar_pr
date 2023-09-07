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
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { Version } from '../../../versioning/entities/version.entity';

@Entity('linked_result')
export class LinkedResult {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @ManyToOne(() => Result, (rs) => rs.id, { nullable: true })
  @JoinColumn({
    name: 'linked_results_id',
  })
  linked_results_id!: number;

  @Column({
    name: 'legacy_link',
    type: 'text',
    nullable: true,
  })
  legacy_link!: string;

  @ManyToOne(() => Result, (rs) => rs.id)
  @JoinColumn({
    name: 'origin_result_id',
  })
  origin_result_id: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
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
