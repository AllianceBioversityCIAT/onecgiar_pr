import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

export enum ReviewActionEnum {
  APPROVE = 'APPROVED',
  REJECT = 'REJECTED',
}

@Entity('result_review_history')
export class ResultReviewHistory {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false,
  })
  result_id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result;

  @Column({
    name: 'action',
    type: 'enum',
    enum: ReviewActionEnum,
    nullable: false,
  })
  action: ReviewActionEnum;

  @Column({
    name: 'comment',
    type: 'text',
    nullable: true,
  })
  comment: string;

  @Column({
    name: 'created_by',
    type: 'int',
    nullable: false,
  })
  created_by: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  obj_created_by: User;

  @CreateDateColumn({
    name: 'created_at',
    nullable: false,
    type: 'timestamp',
  })
  created_at: Date;
}
