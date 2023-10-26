import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GlobalParameterCategory } from './global-parameter-category.entity';
import { BaseEntity } from '../../../shared/entities/base-entity';

@Entity('global_parameters')
export class GlobalParameter extends BaseEntity {
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
  @Index({ unique: true })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    name: 'value',
    type: 'text',
    nullable: true,
  })
  value: string;

  @Column({ nullable: false, name: 'global_parameter_categories_id' })
  global_parameter_categories_id: number;

  @ManyToOne(() => GlobalParameterCategory, (gp) => gp.id)
  @JoinColumn({
    name: 'global_parameter_categories_id',
  })
  global_parameter_categories_object: GlobalParameterCategory;
}
