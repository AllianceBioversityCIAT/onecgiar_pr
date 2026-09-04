import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResultType } from '../../result_types/entities/result_type.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('investment_discontinued_option')
export class InvestmentDiscontinuedOption {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'investment_discontinued_option_id',
  })
  investment_discontinued_option_id: number;

  @Column({
    name: 'option',
    type: 'text',
  })
  option: string;

  @Column({
    name: 'order',
    type: 'int',
    nullable: false,
  })
  order: number;

  //relations
  @Column({
    name: 'result_type_id',
    type: 'bigint',
    nullable: false,
  })
  result_type_id: number;

  /**
   * P2-3292 — phase year this reason was introduced for. `NULL` on the six rows
   * that predate the axis (the base generation). The service serves exactly one
   * generation per request: the newest whose value is at or below the result's
   * phase year, which is what keeps a 2025-phase result on its original reasons
   * without rewriting or de-activating a single row.
   */
  @Column({ name: 'phase_year_from', type: 'int', nullable: true })
  phase_year_from: number | null;

  /**
   * P2-3292 — `1` when this reason needs its free-text box ("Other"). The legacy
   * row is still recognised by `investment_discontinued_option_id == 6` in the
   * client, because flagging it would have meant an UPDATE on a live catalogue row.
   */
  @Column({ name: 'requires_description', type: 'boolean', nullable: true })
  requires_description: boolean | null;

  //audit fields
  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column()
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date: Date;

  @Column({ nullable: true })
  last_updated_by: number;

  //object relations
  @ManyToOne(() => ResultType, (rt) => rt.obj_result_type_discontinued)
  @JoinColumn({
    name: 'result_type_id',
  })
  result_type_discontinued: ResultType;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by_object: User;

  @ManyToOne(() => User, (u) => u.id)
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by_object: User;
}
