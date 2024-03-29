import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { Result } from '../../results/entities/result.entity';
import { IpsrRole } from './ipsr-role.entity';
import { ResultInnovationPackage } from '../result-innovation-package/entities/result-innovation-package.entity';
import { ResultIpEoiOutcome } from '../innovation-pathway/entities/result-ip-eoi-outcome.entity';
import { ResultIpSdgTargets } from '../innovation-pathway/entities/result-ip-sdg-targets.entity';
import { ResultsIpActor } from '../results-ip-actors/entities/results-ip-actor.entity';
import { ResultsIpInstitutionType } from '../results-ip-institution-type/entities/results-ip-institution-type.entity';
import { ResultsByIpInnovationUseMeasure } from '../results-by-ip-innovation-use-measures/entities/results-by-ip-innovation-use-measure.entity';
import { ClarisaInnovationReadinessLevel } from '../../../clarisa/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import { ClarisaInnovationUseLevel } from '../../../clarisa/clarisa-innovation-use-levels/entities/clarisa-innovation-use-level.entity';
import { ResultsInnovationPackagesEnablerType } from '../results-innovation-packages-enabler-type/entities/results-innovation-packages-enabler-type.entity';

@Entity('result_by_innovation_package')
export class Ipsr extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_by_innovation_package_id',
    type: 'bigint',
  })
  result_by_innovation_package_id: number;

  @Column({
    name: 'result_innovation_package_id',
    type: 'bigint',
  })
  result_innovation_package_id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'ipsr_role_id',
    type: 'bigint',
  })
  ipsr_role_id: number;

  @Column({
    name: 'readinees_evidence_link',
    type: 'text',
    nullable: true,
  })
  readinees_evidence_link: string;

  @Column({
    name: 'use_evidence_link',
    type: 'text',
    nullable: true,
  })
  use_evidence_link: string;

  @Column({
    name: 'readiness_level_evidence_based',
    type: 'bigint',
    nullable: true,
  })
  readiness_level_evidence_based: number;

  @Column({
    name: 'use_level_evidence_based',
    type: 'bigint',
    nullable: true,
  })
  use_level_evidence_based: number;

  @Column({
    name: 'current_innovation_readiness_level',
    type: 'bigint',
    nullable: true,
  })
  current_innovation_readiness_level!: number;

  @Column({
    name: 'current_innovation_use_level',
    type: 'bigint',
    nullable: true,
  })
  current_innovation_use_level!: number;

  @Column({
    name: 'potential_innovation_readiness_level',
    type: 'bigint',
    nullable: true,
  })
  potential_innovation_readiness_level!: number;

  @Column({
    name: 'potential_innovation_use_level',
    type: 'bigint',
    nullable: true,
  })
  potential_innovation_use_level!: number;

  @Column({
    name: 'use_details_of_evidence',
    type: 'text',
    nullable: true,
  })
  use_details_of_evidence!: string;

  @Column({
    name: 'readiness_details_of_evidence',
    type: 'text',
    nullable: true,
  })
  readiness_details_of_evidence!: string;

  @ManyToOne(() => IpsrRole, (ir) => ir.obj_ipsr_role)
  @JoinColumn({
    name: 'ipsr_role_id',
  })
  obj_ipsr_role: IpsrRole;

  @ManyToOne(
    () => ResultInnovationPackage,
    (r) => r.result_innovation_package_id,
  )
  @JoinColumn({
    name: 'result_innovation_package_id',
  })
  obj_result_by_innovation_package: ResultInnovationPackage;

  @ManyToOne(() => Result, (r) => r.obj_result)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result;

  @OneToMany(
    () => ResultIpEoiOutcome,
    (rio) => rio.obj_result_by_innovation_package,
  )
  obj_result_by_innovation_package_eoi_outcome: ResultIpEoiOutcome[];

  @OneToMany(
    () => ResultIpSdgTargets,
    (ris) => ris.obj_result_by_innovation_package_sdg_targets,
  )
  obj_result_by_innovation_package_sdg_targets: ResultIpSdgTargets[];

  @OneToMany(() => ResultsIpActor, (ripa) => ripa.obj_result_ip_result_id)
  obj_result_ip_actors: ResultsIpActor[];

  @OneToMany(
    () => ResultsByIpInnovationUseMeasure,
    (ripa) => ripa.obj_result_ip_result,
  )
  obj_result_ip_result_measures: ResultsByIpInnovationUseMeasure[];

  @OneToMany(
    () => ResultsIpInstitutionType,
    (ripa) => ripa.obj_result_ip_results,
  )
  obj_result_ip_result_institutions_type: ResultsIpInstitutionType[];

  @ManyToOne(() => ClarisaInnovationReadinessLevel, (cirl) => cirl.id)
  @JoinColumn({
    name: 'readiness_level_evidence_based',
  })
  obj_readiness_level_evidence_based: ClarisaInnovationReadinessLevel;

  @ManyToOne(() => ClarisaInnovationUseLevel, (cirl) => cirl.id)
  @JoinColumn({
    name: 'use_level_evidence_based',
  })
  obj_use_level_evidence_based: ClarisaInnovationUseLevel;

  @ManyToOne(() => ClarisaInnovationReadinessLevel, (cirl) => cirl.id)
  @JoinColumn({
    name: 'current_innovation_readiness_level',
  })
  obj_current_innovation_readiness_level!: ClarisaInnovationReadinessLevel;

  @ManyToOne(() => ClarisaInnovationUseLevel, (cirl) => cirl.id)
  @JoinColumn({
    name: 'current_innovation_use_level',
  })
  obj_current_innovation_use_level!: ClarisaInnovationUseLevel;

  @ManyToOne(() => ClarisaInnovationReadinessLevel, (cirl) => cirl.id)
  @JoinColumn({
    name: 'potential_innovation_readiness_level',
  })
  obj_potential_innovation_readiness_level!: number;

  @ManyToOne(() => ClarisaInnovationUseLevel, (cirl) => cirl.id)
  @JoinColumn({
    name: 'potential_innovation_use_level',
  })
  obj_potential_innovation_use_level!: ClarisaInnovationUseLevel;

  @OneToMany(
    () => ResultsInnovationPackagesEnablerType,
    (ripet) => ripet.obj_result_by_innovation_package,
  )
  children_innovation_packages_enabler_type: ResultsInnovationPackagesEnablerType[];
}
