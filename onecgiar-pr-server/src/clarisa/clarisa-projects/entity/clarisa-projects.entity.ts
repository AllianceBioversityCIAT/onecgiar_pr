import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ResultsByProjects } from '../../../api/results/results_by_projects/entities/results_by_projects.entity';
import { ClarisaInstitution } from '../../clarisa-institutions/entities/clarisa-institution.entity';

@Entity('clarisa_projects')
export class ClarisaProject {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'short_name', type: 'text' })
  shortName: string;

  @Column({ name: 'full_name', type: 'text' })
  fullName: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({
    name: 'total_budget',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  totalBudget: string | null;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  remaining: string | null;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  annual: string | null;

  @Column({
    name: 'source_of_funding',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sourceOfFunding: string | null;

  @Index('IDX_clarisa_projects_organization_code')
  @Column({ name: 'organization_code', type: 'bigint', nullable: true })
  organizationCode: number | null;

  @ManyToOne(() => ClarisaInstitution, { nullable: true })
  @JoinColumn({
    name: 'organization_code',
    referencedColumnName: 'id',
  })
  obj_organization: ClarisaInstitution | null;

  @Index('IDX_clarisa_projects_funder_code')
  @Column({ name: 'funder_code', type: 'bigint', nullable: true })
  funderCode: number | null;

  @Column({ name: 'interim_director_review', type: 'text', nullable: true })
  interimDirectorReview: string | null;

  @Column({ name: 'project_results', type: 'text', nullable: true })
  projectResults: string | null;

  @Column({ name: 'modification_justification', type: 'text', nullable: true })
  modificationJustification: string | null;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    precision: 6,
    nullable: true,
  })
  createdAt: Date | null;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    precision: 6,
    nullable: true,
  })
  updatedAt: Date | null;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, nullable: true })
  isActive: boolean | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  @OneToMany(
    () => ResultsByProjects,
    (resultProject) => resultProject.obj_clarisa_project,
  )
  obj_results_by_projects: ResultsByProjects[];
}
