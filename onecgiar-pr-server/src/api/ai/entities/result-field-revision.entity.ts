import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Result } from '../../results/entities/result.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';

export enum ResultFieldRevisionFieldName {
  TITLE = 'title',
  DESCRIPTION = 'description',
  SHORT_TITLE = 'short_title',
}

@Entity('result_field_revision')
@Index('IDX_result_field_revision_result_field', ['result_id', 'field_name'])
@Index('IDX_result_field_revision_user', ['user_id'])
export class ResultFieldRevision {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'result_id', type: 'bigint', nullable: false })
  result_id: number;

  @Column({ name: 'user_id', type: 'int', nullable: false })
  user_id: number;

  @Column({
    name: 'field_name',
    type: 'enum',
    enum: ResultFieldRevisionFieldName,
    nullable: false,
  })
  field_name: ResultFieldRevisionFieldName;

  @Column({
    name: 'old_value',
    type: 'longtext',
    collation: 'utf8mb3_unicode_ci',
    nullable: true,
  })
  old_value: string;

  @Column({
    name: 'new_value',
    type: 'longtext',
    collation: 'utf8mb3_unicode_ci',
    nullable: true,
  })
  new_value: string;

  @Column({
    name: 'change_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  change_reason: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    nullable: false,
  })
  created_at: Date;

  // Relations
  @ManyToOne(() => Result, (result) => result.obj_result_field_revisions)
  @JoinColumn({ name: 'result_id' })
  obj_result: Result;

  @ManyToOne(() => User, (user) => user.obj_result_field_revisions)
  @JoinColumn({ name: 'user_id' })
  obj_user: User;
}
