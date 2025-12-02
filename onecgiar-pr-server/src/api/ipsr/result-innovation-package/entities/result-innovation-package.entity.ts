import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { consensusInitiativeWorkPackage } from './consensus-initiative-work-package.entity';
import { RelevantCountry } from './relevant-country.entity';
import { RegionalLeadership } from './regional-leadership.entity';
import { RegionalIntegrated } from './regional-integrated.entity';
import { ActiveBackstopping } from './active-backstopping.entity';
import { Result } from '../../../results/entities/result.entity';
import { Ipsr } from '../../entities/ipsr.entity';
import { ClarisaInnovationReadinessLevel } from '../../../../clarisa/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import { UnitTime } from './unit-time.entity';
import { AssessedDuringExpertWorkshop } from '../../assessed-during-expert-workshop/entities/assessed-during-expert-workshop.entity';
@Entity('result_innovation_package')
export class ResultInnovationPackage extends BaseEntity {
  @Column({
    name: 'result_innovation_package_id',
    type: 'bigint',
    primary: true,
  })
  result_innovation_package_id: number;

  @Column({
    name: 'experts_is_diverse',
    type: 'boolean',
    nullable: true,
  })
  experts_is_diverse!: boolean;

  @Column({
    name: 'is_not_diverse_justification',
    type: 'text',
    nullable: true,
  })
  is_not_diverse_justification!: string;

  @Column({
    name: 'consensus_initiative_work_package_id',
    type: 'int',
    nullable: true,
  })
  consensus_initiative_work_package_id!: number;

  @Column({
    name: 'relevant_country_id',
    type: 'int',
    nullable: true,
  })
  relevant_country_id!: number;

  @Column({
    name: 'regional_leadership_id',
    type: 'int',
    nullable: true,
  })
  regional_leadership_id!: number;

  @Column({
    name: 'regional_integrated_id',
    type: 'int',
    nullable: true,
  })
  regional_integrated_id!: number;

  @Column({
    name: 'active_backstopping_id',
    type: 'int',
    nullable: true,
  })
  active_backstopping_id!: number;

  @Column({
    name: 'use_level_evidence_based',
    type: 'bigint',
    nullable: true,
  })
  use_level_evidence_based!: number;

  @Column({
    name: 'readiness_level_evidence_based',
    type: 'bigint',
    nullable: true,
  })
  readiness_level_evidence_based!: number;

  @Column({
    name: 'is_expert_workshop_organized',
    type: 'boolean',
    nullable: true,
  })
  is_expert_workshop_organized!: boolean;

  @Column({
    name: 'initiative_expected_time',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  initiative_expected_time!: string;

  @Column({
    name: 'initiative_unit_time_id',
    type: 'bigint',
    nullable: true,
  })
  initiative_unit_time_id!: number;

  @Column({
    name: 'bilateral_expected_time',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  bilateral_expected_time!: string;

  @Column({
    name: 'bilateral_unit_time_id',
    type: 'bigint',
    nullable: true,
  })
  bilateral_unit_time_id!: number;

  @Column({
    name: 'partner_expected_time',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  partner_expected_time!: string;

  @Column({
    name: 'partner_unit_time_id',
    type: 'bigint',
    nullable: true,
  })
  partner_unit_time_id!: number;

  @Column({
    name: 'is_result_ip_published',
    type: 'boolean',
    nullable: true,
  })
  is_result_ip_published!: boolean;

  @Column({
    name: 'ipsr_pdf_report',
    type: 'text',
    nullable: true,
  })
  ipsr_pdf_report!: string;

  @Column({
    name: 'assessed_during_expert_workshop_id',
    type: 'bigint',
    nullable: true,
  })
  assessed_during_expert_workshop_id!: number;

  @Column({
    name: 'scaling_ambition_blurb',
    type: 'text',
    nullable: true,
  })
  scaling_ambition_blurb!: string;

  @Column({
    name: 'has_scaling_studies',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  has_scaling_studies: boolean;

  @Column({
    name: 'participants_consent',
    type: 'boolean',
    nullable: true,
    default: null,
  })
  participants_consent: boolean;

  @ManyToOne(() => AssessedDuringExpertWorkshop, (adewp) => adewp.id)
  @JoinColumn({
    name: 'assessed_during_expert_workshop_id',
  })
  obj_assessed_during_expert_workshop!: AssessedDuringExpertWorkshop;

  @ManyToOne(
    () => consensusInitiativeWorkPackage,
    (ciwp) => ciwp.consensus_initiative_work_package_id,
    { nullable: true },
  )
  @JoinColumn({
    name: 'consensus_initiative_work_package_id',
  })
  obj_consensus_initiative_work_package!: consensusInitiativeWorkPackage;

  @ManyToOne(() => RelevantCountry, (rc) => rc.relevant_country_id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'relevant_country_id',
  })
  obj_relevant_country!: RelevantCountry;

  @ManyToOne(() => RegionalLeadership, (rl) => rl.regional_leadership_id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'regional_leadership_id',
  })
  obj_regional_leadership!: RegionalLeadership;

  @ManyToOne(() => RegionalIntegrated, (ri) => ri.regional_integrated_id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'regional_integrated_id',
  })
  obj_regional_integrated!: RegionalIntegrated;

  @ManyToOne(() => ActiveBackstopping, (ab) => ab.active_backstopping_id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'active_backstopping_id',
  })
  obj_active_backstopping!: ActiveBackstopping;

  @OneToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_innovation_package_id',
  })
  obj_result_innovation_package: Result;

  @OneToMany(() => Ipsr, (i) => i.obj_result_by_innovation_package)
  obj_result: Ipsr[];

  @ManyToOne(() => ClarisaInnovationReadinessLevel, (cirl) => cirl.id)
  @JoinColumn({
    name: 'use_level_evidence_based',
  })
  obj_use_level_evidence_based: ClarisaInnovationReadinessLevel;

  @ManyToOne(() => ClarisaInnovationReadinessLevel, (cirl) => cirl.id)
  @JoinColumn({
    name: 'readiness_level_evidence_based',
  })
  obj_readiness_level_evidence_based: ClarisaInnovationReadinessLevel;

  @ManyToOne(() => UnitTime, (ut) => ut.unit_time_id)
  @JoinColumn({
    name: 'initiative_unit_time_id',
  })
  obj_initiative_unit_time_id: UnitTime;

  @ManyToOne(() => UnitTime, (ut) => ut.unit_time_id)
  @JoinColumn({
    name: 'bilateral_unit_time_id',
  })
  obj_bilateral_unit_time_id: UnitTime;

  @ManyToOne(() => UnitTime, (ut) => ut.unit_time_id)
  @JoinColumn({
    name: 'partner_unit_time_id',
  })
  obj_partner_unit_time: UnitTime;
}
