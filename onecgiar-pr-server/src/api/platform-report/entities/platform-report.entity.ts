import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Version } from '../../versioning/entities/version.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { Template } from './template.entity';

@Entity()
export class PlatformReport {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({
    type: 'text',
    nullable: false,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  function_data_name: string;

  @Column({ nullable: false })
  template_id: number;

  //versioning field
  @Column()
  version_id: number;

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

  @ManyToOne(() => Version, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'version_id',
  })
  version_object: number;

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

  @ManyToOne(() => Template, (t) => t.id, { nullable: false })
  @JoinColumn({
    name: 'template_id',
  })
  template_object: Template;
}
