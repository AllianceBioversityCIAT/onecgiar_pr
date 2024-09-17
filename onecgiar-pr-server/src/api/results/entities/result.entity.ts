import { User } from '../../../auth/modules/user/entities/user.entity';
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
import { GenderTagLevel } from '../gender_tag_levels/entities/gender_tag_level.entity';
import { ResultType } from '../result_types/entities/result_type.entity';
import { Version } from '../../versioning/entities/version.entity';
import { ResultLevel } from '../result_levels/entities/result_level.entity';
import { LegacyResult } from '../legacy-result/entities/legacy-result.entity';
import { ClarisaGeographicScope } from '../../../clarisa/clarisa-geographic-scopes/entities/clarisa-geographic-scope.entity';
import { ResultsKnowledgeProduct } from '../results-knowledge-products/entities/results-knowledge-product.entity';
import { ResultRegion } from '../result-regions/entities/result-region.entity';
import { ResultCountry } from '../result-countries/entities/result-country.entity';
import { Ipsr } from '../../ipsr/entities/ipsr.entity';
import { ResultActor } from '../result-actors/entities/result-actor.entity';
import { ResultsByInititiative } from '../results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultIpExpertWorkshopOrganized } from '../../ipsr/innovation-pathway/entities/result-ip-expert-workshop-organized.entity';
import { ResultStatus } from '../result-status/entities/result-status.entity';
import { ResultAnswer } from '../result-questions/entities/result-answers.entity';
import { ResultsCenter } from '../results-centers/entities/results-center.entity';
import { ResultsByInstitution } from '../results_by_institutions/entities/results_by_institution.entity';
import { ShareResultRequest } from '../share-result-request/entities/share-result-request.entity';
import { ResultsTocResult } from '../results-toc-results/entities/results-toc-result.entity';

@Entity()
export class Result {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'result_code',
    type: 'bigint',
  })
  result_code: number;

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

  @Column({
    name: 'result_type_id',
    type: 'int',
    nullable: true,
  })
  result_type_id: number;

  @ManyToOne(() => ResultType, (rt) => rt.id)
  @JoinColumn({
    name: 'result_type_id',
  })
  obj_result_type: ResultType;

  @Column({
    name: 'result_level_id',
    type: 'int',
    nullable: true,
  })
  result_level_id: number;

  @ManyToOne(() => ResultLevel, (rl) => rl.id)
  @JoinColumn({
    name: 'result_level_id',
  })
  obj_result_level: ResultLevel;

  @Column({
    name: 'gender_tag_level_id',
    type: 'bigint',
    nullable: true,
  })
  gender_tag_level_id!: number;

  @ManyToOne(() => GenderTagLevel, (gtl) => gtl.id, { nullable: true })
  @JoinColumn({
    name: 'gender_tag_level_id',
  })
  obj_gender_tag_level!: GenderTagLevel;

  @Column({
    name: 'climate_change_tag_level_id',
    type: 'bigint',
    nullable: true,
  })
  climate_change_tag_level_id!: number;

  @ManyToOne(() => GenderTagLevel, (gtl) => gtl.id, { nullable: true })
  @JoinColumn({
    name: 'climate_change_tag_level_id',
  })
  obj_climate_change_tag_level!: GenderTagLevel;

  @Column({
    name: 'nutrition_tag_level_id',
    type: 'bigint',
    nullable: true,
  })
  nutrition_tag_level_id!: number;

  @ManyToOne(() => GenderTagLevel, (gtl) => gtl.id, { nullable: true })
  @JoinColumn({
    name: 'nutrition_tag_level_id',
  })
  obj_nutrition_tag_level!: GenderTagLevel;

  @Column({
    name: 'environmental_biodiversity_tag_level_id',
    type: 'bigint',
    nullable: true,
  })
  environmental_biodiversity_tag_level_id!: number;

  @ManyToOne(() => GenderTagLevel, (gtl) => gtl.id, { nullable: true })
  @JoinColumn({
    name: 'environmental_biodiversity_tag_level_id',
  })
  obj_environmental_biodiversity_tag_level!: GenderTagLevel;

  @Column({
    name: 'poverty_tag_level_id',
    type: 'bigint',
    nullable: true,
  })
  poverty_tag_level_id!: number;

  @ManyToOne(() => GenderTagLevel, (gtl) => gtl.id, { nullable: true })
  @JoinColumn({
    name: 'poverty_tag_level_id',
  })
  obj_poverty_tag_level_id!: GenderTagLevel;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column({
    name: 'in_qa',
    type: 'tinyint',
    default: 0,
  })
  in_qa: boolean;

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

  @Column({
    name: 'status',
    type: 'tinyint',
    nullable: true,
    default: 0,
  })
  status!: number;

  @Column({
    name: 'status_id',
    type: 'bigint',
    nullable: true,
    default: 1,
  })
  status_id!: number;

  @ManyToOne(() => ResultStatus, (rs) => rs.result_status_list)
  @JoinColumn({
    name: 'status_id',
  })
  obj_status!: ResultStatus;

  @Column({
    name: 'reported_year_id',
    type: 'year',
    nullable: true,
  })
  reported_year_id: number;

  @Column({
    name: 'legacy_id',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  legacy_id: string;

  @ManyToOne(() => LegacyResult, (lr) => lr.legacy_id, { nullable: true })
  @JoinColumn({
    name: 'legacy_id',
  })
  obj_legacy!: LegacyResult;

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
    default: false,
  })
  no_applicable_partner: boolean;

  @Column({
    name: 'geographic_scope_id',
    type: 'int',
    nullable: true,
  })
  geographic_scope_id: number;

  @ManyToOne(() => ClarisaGeographicScope, (cgo) => cgo.id, { nullable: true })
  @JoinColumn({
    name: 'geographic_scope_id',
  })
  obj_geographic_scope!: ClarisaGeographicScope;

  @Column({
    name: 'has_regions',
    nullable: true,
    type: 'boolean',
  })
  has_regions: boolean;

  @Column({
    name: 'lead_contact_person',
    type: 'text',
    nullable: true,
  })
  lead_contact_person!: string;

  @Column({
    name: 'has_countries',
    nullable: true,
    type: 'boolean',
  })
  has_countries: boolean;

  @Column({
    name: 'is_discontinued',
    nullable: true,
    type: 'boolean',
  })
  is_discontinued: boolean;

  @Column({
    name: 'is_replicated',
    nullable: true,
    type: 'boolean',
    default: false,
  })
  is_replicated!: boolean;

  @Column({
    name: 'last_action_type',
    nullable: true,
    type: 'text',
  })
  last_action_type!: string;

  @Column({
    name: 'justification_action_type',
    nullable: true,
    type: 'text',
  })
  justification_action_type!: string;

  @Column({ name: 'is_lead_by_partner', type: 'boolean', nullable: true })
  is_lead_by_partner: boolean;

  // helpers??
  initiative_id!: number;

  @OneToMany(() => ResultsKnowledgeProduct, (rkp) => rkp.result_object)
  result_knowledge_product_array: ResultsKnowledgeProduct[];

  @OneToMany(() => ResultRegion, (rr) => rr.result_object)
  result_region_array: ResultRegion[];

  @OneToMany(() => ResultCountry, (rc) => rc.result_object)
  result_country_array: ResultCountry[];

  @OneToMany(() => Ipsr, (rc) => rc.obj_result)
  obj_result: Ipsr[];

  @OneToMany(() => ResultActor, (rc) => rc.obj_result)
  obj_result_actor: ResultActor[];

  @OneToMany(() => ResultsByInstitution, (rbi) => rbi.obj_result)
  result_by_institution_array: ResultsByInstitution[];

  @OneToMany(() => ResultsByInititiative, (rbi) => rbi.obj_result)
  obj_result_by_initiatives: ResultsByInititiative[];

  @OneToMany(() => ResultsCenter, (rc) => rc.result_object)
  result_center_array: ResultsCenter[];

  @OneToMany(
    () => ResultIpExpertWorkshopOrganized,
    (ripewo) => ripewo.obj_result_expert_workshop,
  )
  obj_result_expert_workshop: ResultIpExpertWorkshopOrganized[];

  @OneToMany(() => ResultAnswer, (ra) => ra.obj_result_id)
  obj_result_id: ResultAnswer[];

  @OneToMany(() => ShareResultRequest, (ra) => ra.obj_result)
  obj_share_result: ShareResultRequest[];

  @OneToMany(() => ResultsTocResult, (ra) => ra.results_id)
  obj_results_toc_result: ResultsTocResult[];
}
