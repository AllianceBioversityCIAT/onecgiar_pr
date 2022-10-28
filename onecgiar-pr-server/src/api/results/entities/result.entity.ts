import { User } from '../../../auth/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GenderTagLevel } from '../gender_tag_levels/entities/gender_tag_level.entity';
import { ResultType } from '../result_types/entities/result_type.entity';
import { Version } from '../versions/entities/version.entity';
import { Year } from '../years/entities/year.entity';
import { ResultLevel } from '../result_levels/entities/result_level.entity';
import { LegacyResult } from '../legacy-result/entities/legacy-result.entity';
import { ClarisaGeographicScope } from '../../../clarisa/clarisa-geographic-scopes/entities/clarisa-geographic-scope.entity';

@Entity()
export class Result {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'title',
    type: 'text',
    nullable: false,
  })
  title: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;

  @ManyToOne(() => ResultType, (rt) => rt.id)
  @JoinColumn({
    name: 'result_type_id',
  })
  result_type_id: number;

  @ManyToOne(() => ResultLevel, (rl) => rl.id)
  @JoinColumn({
    name: 'result_level_id',
  })
  result_level_id: number;

  @ManyToOne(() => GenderTagLevel, (gtl) => gtl.id, { nullable: true })
  @JoinColumn({
    name: 'gender_tag_level_id',
  })
  gender_tag_level_id!: number;

  @ManyToOne(() => GenderTagLevel, (gtl) => gtl.id, { nullable: true })
  @JoinColumn({
    name: 'climate_change_tag_level_id',
  })
  climate_change_tag_level_id!: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => Version, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'version_id',
  })
  version_id: number;

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
    name: 'status',
    type: 'tinyint',
    nullable: true,
    default: 0,
  })
  status!: number;

  @ManyToOne(() => Year, (y) => y.year, { nullable: true })
  @JoinColumn({
    name: 'reported_year_id',
  })
  reported_year_id: number;

  @ManyToOne(() => LegacyResult, (lr) => lr.legacy_id, { nullable: true })
  @JoinColumn({
    name: 'legacy_id',
  })
  legacy_id!: string;

  @Column({
    name: 'krs_url',
    type: 'text',
    nullable: true,
  })
  krs_url!: string;

  @Column({
    name: 'is_krs',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  is_krs!: boolean;

  @Column({
    name: 'no_applicable_partner',
    type: 'boolean',
    default: false
  })
  no_applicable_partner: boolean;

  @ManyToOne(() => ClarisaGeographicScope, cgo => cgo.id, {nullable: true})
  @JoinColumn({
    name: 'geographic_scope_id'
  })
  geographic_scope_id!:number
}
