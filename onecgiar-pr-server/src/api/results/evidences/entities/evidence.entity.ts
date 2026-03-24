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
import { EvidenceType } from '../../evidence_types/entities/evidence_type.entity';
import { EvidenceSharepoint } from './evidence-sharepoint.entity';

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
    name: 'nutrition_related',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  nutrition_related!: boolean;

  @Column({
    name: 'environmental_biodiversity_related',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  environmental_biodiversity_related!: boolean;

  @Column({
    name: 'poverty_related',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  poverty_related!: boolean;

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
    name: 'is_sharepoint',
    type: 'tinyint',
    nullable: false,
    default: 0,
  })
  is_sharepoint: number;

  @Column({
    name: 'innovation_readiness_related',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  innovation_readiness_related!: boolean;

  @Column({
    name: 'innovation_use_related',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  innovation_use_related!: boolean;

  @Column({
    name: 'innov_dev_user_demand',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  innov_dev_user_demand!: boolean;

  // relations

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: true,
  })
  result_id: number;

  @Column({
    name: 'evidence_type_id',
    type: 'bigint',
    nullable: true,
  })
  evidence_type_id: number;

  // object relations

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result!: Result;

  @ManyToOne(() => EvidenceType, (et) => et.id)
  @JoinColumn({
    name: 'evidence_type_id',
  })
  evidence_type: EvidenceType;

  @OneToMany(
    () => EvidenceSharepoint,
    (evidenceSharepoint) => evidenceSharepoint.evidence_object,
  )
  evidenceSharepointArray: EvidenceSharepoint[];

  // audit fields

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
