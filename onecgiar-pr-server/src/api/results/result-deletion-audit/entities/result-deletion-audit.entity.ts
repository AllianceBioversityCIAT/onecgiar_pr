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
import { ResultDeletionAuditSource } from '../result-deletion-audit-source.enum';

@Entity('result_deletion_audit')
export class ResultDeletionAudit {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'deleted_by_user_id',
    type: 'int',
  })
  deleted_by_user_id: number;

  @CreateDateColumn({
    name: 'created_date',
    type: 'timestamp',
    nullable: false,
  })
  created_date: Date;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date: Date;

  @Column({
    name: 'created_by',
    type: 'bigint',
    nullable: true,
  })
  created_by: number;

  @Column({
    name: 'last_updated_by',
    type: 'bigint',
    nullable: true,
  })
  last_updated_by: number;

  @Column({
    name: 'justification',
    type: 'text',
    nullable: true,
  })
  justification: string | null;

  @Column({
    name: 'deletion_source',
    type: 'varchar',
    length: 64,
  })
  deletion_source: ResultDeletionAuditSource;

  @ManyToOne(() => Result, { nullable: false })
  @JoinColumn({ name: 'result_id' })
  obj_result: Result;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'deleted_by_user_id' })
  obj_deleted_by: User;
}
