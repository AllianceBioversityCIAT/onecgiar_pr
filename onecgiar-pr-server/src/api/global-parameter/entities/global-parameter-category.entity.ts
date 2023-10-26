import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GlobalParameter } from './global-parameter.entity';
import { BaseEntity } from '../../../shared/entities/base-entity';

@Entity('global_parameter_categories')
export class GlobalParameterCategory extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'varchar',
    nullable: false,
    length: 64,
  })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string;
}
