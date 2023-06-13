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
import { Version } from '../../../versioning/entities/version.entity';
import { Result } from '../../entities/result.entity';
import { EvidenceType } from '../../evidence_types/entities/evidence_type.entity';

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

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: true,
  })
  result_id: number;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result!: Result;

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

  @Column({
    name: 'version_id',
    type: 'bigint',
    nullable: false,
  })
  version_id: number;

  @ManyToOne(() => Version, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'version_id',
  })
  obj_version: Version;

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

  @Column({
    name: 'evidence_type_id',
    type: 'bigint',
    nullable: true,
  })
  evidence_type_id: number;

  @ManyToOne(() => EvidenceType, (et) => et.id)
  @JoinColumn({
    name: 'evidence_type_id',
  })
  evidence_type: EvidenceType;
}
