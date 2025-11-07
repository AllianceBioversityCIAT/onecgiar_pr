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
import { InstitutionRole } from '../../institution_roles/entities/institution_role.entity';
import { Result } from '../../entities/result.entity';
import { ClarisaInstitutionsType } from '../../../../clarisa/clarisa-institutions-type/entities/clarisa-institutions-type.entity';
import { ResultInnovSection } from '../../../results-framework-reporting/result_innov_section/entities/result_innov_section.entity';

@Entity()
export class ResultsByInstitutionType {
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
    name: 'other_institution',
    type: 'text',
    nullable: true,
  })
  other_institution!: string;

  @Column({
    name: 'graduate_students',
    type: 'bigint',
    nullable: true,
  })
  graduate_students!: number;

  @Column({
    name: 'addressing_demands',
    type: 'text',
    nullable: true,
  })
  addressing_demands!: string;

  @ManyToOne(() => ResultInnovSection)
  @JoinColumn({ name: 'section_id' })
  obj_section: ResultInnovSection;

  @Column({
    name: 'section_id',
    type: 'bigint',
    nullable: true,
  })
  section_id?: number;

  // relations

  @Column({
    name: 'results_id',
    type: 'bigint',
    nullable: false,
  })
  results_id: number;

  @Column({
    name: 'institution_types_id',
    type: 'int',
    nullable: true,
  })
  institution_types_id: number;

  @Column({
    name: 'institution_roles_id',
    type: 'bigint',
    nullable: false,
  })
  institution_roles_id: number;

  // object relations

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'results_id',
  })
  obj_results: Result;

  @ManyToOne(() => ClarisaInstitutionsType, (cit) => cit.code, {
    nullable: true,
  })
  @JoinColumn({
    name: 'institution_types_id',
  })
  obj_institution_types!: ClarisaInstitutionsType;

  @ManyToOne(() => InstitutionRole, (ir) => ir.id, { nullable: false })
  @JoinColumn({
    name: 'institution_roles_id',
  })
  obj_institution_roles: InstitutionRole;

  // audit fields

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
    name: 'creation_date',
    nullable: false,
    type: 'timestamp',
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
    type: 'timestamp',
  })
  last_updated_date!: Date;
}
