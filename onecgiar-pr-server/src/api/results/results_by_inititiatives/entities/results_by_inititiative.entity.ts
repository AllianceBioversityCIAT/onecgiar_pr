import { User } from '../../../../auth/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { InitiativeRole } from '../../initiative_roles/entities/initiative_role.entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { ResultInitiativeBudget } from '../../result_budget/entities/result_initiative_budget.entity';

@Entity()
export class ResultsByInititiative {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: true,
  })
  result_id: number;

  @ManyToOne(() => Result, (r) => r.obj_result_by_initiatives)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result;

  @Column({
    name: 'inititiative_id',
    type: 'int',
    nullable: true,
  })
  initiative_id: number;

  @ManyToOne(() => ClarisaInitiative, (i) => i.obj_result_by_initiative)
  @JoinColumn({
    name: 'inititiative_id',
  })
  obj_initiative: ClarisaInitiative;

  @Column({
    name: 'initiative_role_id',
    type: 'bigint',
    nullable: false,
  })
  initiative_role_id: number;

  @ManyToOne(() => InitiativeRole, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'initiative_role_id',
  })
  obj_initiative_role: InitiativeRole;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

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
  obj_created: User;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @Column({
    name: 'last_updated_by',
    type: 'int',
    nullable: true,
  })
  last_updated_by: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  obj_last_updated!: User;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;

  @OneToMany(() => ResultInitiativeBudget, (rib) => rib.obj_result_initiative)
  obj_result_initiative_array: ResultInitiativeBudget[];
}
