import { User } from '../../../../auth/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Version } from '../../versions/entities/version.entity';
import { Result } from '../../entities/result.entity';

@Entity('evidence')
export class Evidence {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'link',
    type: 'text',
    nullable: false,
  })
  link: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  result_id!: number;

  @Column({
    name: 'gender_related',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  gender_related!: boolean;

  @Column({
    name: 'youth_related',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  youth_related!: boolean;

  @Column({
    name: 'is_supplementary',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  is_supplementary!: boolean;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'knowledge_product_related',
  })
  knowledge_product_related!: number;

  @ManyToOne(() => Version, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'version_id',
  })
  version_id: number;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    nullable: false,
    default: true,
  })
  is_active: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'creation_date',
    nullable: false,
  })
  creation_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    nullable: true,
  })
  last_updated_date!: Date;
}
