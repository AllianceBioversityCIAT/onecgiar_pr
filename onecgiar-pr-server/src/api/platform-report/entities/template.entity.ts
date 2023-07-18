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
import { Version } from '../../versioning/entities/version.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { PlatformReport } from './platform-report.entity';

@Entity()
export class Template {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({
    type: 'text',
    nullable: false,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  template: string;

  //relations
  @Column({ nullable: true })
  parent_id: number;

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

  @ManyToOne(() => Template, (t) => t.id)
  @JoinColumn({
    name: 'parent_id',
  })
  parent_object: Template;

  @OneToMany(() => Template, (t) => t.parent_object)
  children_array: PlatformReport[];

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

  @OneToMany(() => PlatformReport, (pr) => pr.template_object)
  platform_report_array: PlatformReport[];
}
