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
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

export enum ReviewActionEnum {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  UPDATE = 'UPDATE',
  RESUBMIT = 'RESUBMIT',
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

  /**
   * Science Program involved in the entry (RSB-R-18): the deciding owner, the declining SP or the
   * requested primary. NULL for entries written before that spec.
   */
  @Column({
    name: 'initiative_id',
    type: 'int',
    nullable: true,
  })
  initiative_id: number | null;

  @ManyToOne(() => ClarisaInitiative, (i) => i.id, { nullable: true })
  @JoinColumn({
    name: 'initiative_id',
  })
  obj_initiative: ClarisaInitiative;

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
