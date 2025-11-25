import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { CapdevsDeliveryMethod } from '../../capdevs-delivery-methods/entities/capdevs-delivery-method.entity';
import { CapdevsTerm } from '../../capdevs-terms/entities/capdevs-term.entity';

@Entity('results_capacity_developments')
export class ResultsCapacityDevelopments {
  @PrimaryGeneratedColumn({
    name: 'result_capacity_development_id',
  })
  result_capacity_development_id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false,
  })
  result_id: number;

  @OneToOne(() => Result, (r) => r.obj_result_capacity_development)
  @JoinColumn({
    name: 'result_id',
  })
  result_object: Result;

  @Column({
    name: 'male_using',
    type: 'bigint',
    nullable: true,
  })
  male_using!: number;

  @Column({
    name: 'female_using',
    type: 'bigint',
    nullable: true,
  })
  female_using!: number;

  @Column({
    name: 'non_binary_using',
    type: 'bigint',
    nullable: true,
  })
  non_binary_using!: number;

  @Column({
    name: 'has_unkown_using',
    type: 'bigint',
    nullable: true,
  })
  has_unkown_using!: number;

  @ManyToOne(
    () => CapdevsDeliveryMethod,
    (cdm) => cdm.capdev_delivery_method_id,
    { nullable: true },
  )
  @JoinColumn({
    name: 'capdev_delivery_method_id',
  })
  capdev_delivery_method_id!: number;

  @ManyToOne(() => CapdevsTerm, (ct) => ct.capdev_term_id, { nullable: true })
  @JoinColumn({
    name: 'capdev_term_id',
  })
  capdev_term_id!: number;

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
    name: 'is_attending_for_organization',
    type: 'boolean',
    nullable: true,
  })
  is_attending_for_organization!: boolean;
}
