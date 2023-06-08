import {
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  Entity,
} from 'typeorm';
import { ClarisaInstitutionsType } from '../../../../clarisa/clarisa-institutions-type/entities/clarisa-institutions-type.entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { InstitutionRole } from '../../../results/institution_roles/entities/institution_role.entity';
import { Ipsr } from '../../entities/ipsr.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('result_ip_result_institution_types')
export class ResultsIpInstitutionType extends BaseEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'how_many',
    type: 'bigint',
    nullable: true,
  })
  how_many!: number;

  @Column({
    name: 'result_ip_results_id',
    type: 'bigint',
    nullable: false,
  })
  result_ip_results_id: number;

  @Column({
    name: 'institution_types_id',
    type: 'bigint',
    nullable: true,
  })
  institution_types_id: number;

  @Column({
    name: 'institution_roles_id',
    type: 'bigint',
    nullable: true,
  })
  institution_roles_id: number;

  @Column({
    name: 'evidence_link',
    type: 'text',
    nullable: true,
  })
  evidence_link: string;

  @Column({
    name: 'other_institution',
    type: 'text',
    nullable: true,
  })
  other_institution!: string;

  @Column({
    name: 'graduate_students',
    type: 'text',
    nullable: true,
  })
  graduate_students!: string;

  @ManyToOne(() => Version, (v) => v.id)
  @JoinColumn({
    name: 'version_id',
  })
  obj_version: Version;

  @ManyToOne(() => Ipsr, (iprs) => iprs.obj_result_ip_result_institutions_type)
  @JoinColumn({
    name: 'result_ip_results_id',
  })
  obj_result_ip_results: Ipsr;

  @ManyToOne(() => InstitutionRole, (iprs) => iprs.id)
  @JoinColumn({
    name: 'institution_roles_id',
  })
  obj_institution_roles: Ipsr;

  @ManyToOne(() => ClarisaInstitutionsType, (iprs) => iprs.code)
  @JoinColumn({
    name: 'institution_types_id',
  })
  obj_institution_types: ClarisaInstitutionsType;
}
