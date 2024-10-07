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

@Entity('results_center')
export class ResultsCenter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 15, nullable: true })
  center_id: string;

  @Column({ type: 'bigint', nullable: true })
  result_id: number;

  @Column({
    name: 'is_primary',
    type: 'boolean',
    nullable: true,
  })
  is_primary: boolean;

  @Column({
    name: 'from_cgspace',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  from_cgspace: boolean;

  @Column({ name: 'is_leading_result', type: 'boolean', nullable: true })
  is_leading_result: boolean;

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

  //object relations
  @ManyToOne(() => ClarisaCenter, (cc) => cc.result_center_array)
  @JoinColumn({
    name: 'center_id',
  })
  clarisa_center_object: ClarisaCenter;

  @ManyToOne(() => Result, (r) => r.result_center_array)
  @JoinColumn({
    name: 'result_id',
  })
  result_object: Result;
}
