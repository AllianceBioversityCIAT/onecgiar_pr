import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('result_qaed_log')
export class ResultQaedLog {
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
    name: 'qaed_date',
    type: 'date',
  })
  qaed_date: Date;

  @Column({
    name: 'qaed_comments',
    type: 'text',
    nullable: true,
  })
  qaed_comments: string;

  @Column({
    name: 'qaed_user',
    type: 'bigint',
  })
  qaed_user: number;

  @ManyToOne(() => Result, (r) => r.obj_result_qaed, { nullable: true })
  @JoinColumn({
    name: 'result_id',
  })
  obj_result_id_qaed: Result;

  @ManyToOne(() => User, (u) => u.obj_qaed_user, { nullable: true })
  @JoinColumn({
    name: 'qaed_user',
  })
  obj_qaed_user: User;
}
