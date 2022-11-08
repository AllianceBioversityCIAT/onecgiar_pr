import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaMeliaStudyType } from '../../../../clarisa/clarisa-melia-study-type/entities/clarisa-melia-study-type.entity';
import { Result } from '../../entities/result.entity';
import { Version } from '../../versions/entities/version.entity';

@Entity()
export class ResultsKnowledgeProduct {
  @PrimaryGeneratedColumn({
    name: 'result_knowledge_product_id',
    type: 'bigint',
  })
  result_knowledge_product_id: number;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'results_id',
  })
  results_id: number;

  @Column({
    name: 'handle',
    type: 'text',
    nullable: true,
  })
  handle: string;

  @Column({
    name: 'issue_date',
    type: 'bigint',
    nullable: true,
  })
  issue_date: number;

  @Column({
    name: 'knowledge_product_type',
    type: 'text',
    nullable: true,
  })
  knowledge_product_type: string;

  @Column({
    name: 'is_peer_reviewed',
    type: 'boolean',
    nullable: true,
  })
  is_peer_reviewed: boolean;

  @Column({
    name: 'is_isi',
    type: 'boolean',
    nullable: true,
  })
  is_isi: boolean;

  @Column({
    name: 'doi',
    type: 'text',
    nullable: true,
  })
  doi: string;

  @Column({
    name: 'accesibility',
    type: 'text',
    nullable: true,
  })
  accesibility: string;

  @Column({
    name: 'licence',
    type: 'text',
    nullable: true,
  })
  licence: string;

  @Column({
    name: 'comodity',
    type: 'text',
    nullable: true,
  })
  comodity: string;

  @Column({
    name: 'sponsors',
    type: 'text',
    nullable: true,
  })
  sponsors: string;

  @Column({
    name: 'findable',
    type: 'float',
    nullable: true,
  })
  findable: number;

  @Column({
    name: 'accesible',
    type: 'float',
    nullable: true,
  })
  accesible: number;

  @Column({
    name: 'interoperable',
    type: 'float',
    nullable: true,
  })
  interoperable: number;

  @Column({
    name: 'reusable',
    type: 'float',
    nullable: true,
  })
  reusable: number;

  @Column({
    name: 'is_melia',
    type: 'boolean',
    nullable: true,
  })
  is_melia: boolean;

  @Column({
    name: 'melia_previous_submitted',
    type: 'boolean',
    nullable: true,
  })
  melia_previous_submitted: boolean;

  @ManyToOne(() => ClarisaMeliaStudyType, (cmst) => cmst.id)
  @JoinColumn({
    name: 'melia_type_id',
  })
  melia_type_id: number;

  //versioning field
  @ManyToOne(() => Version, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'version_id',
  })
  version_id: number;

  //audit fields
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

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by: number;
}
