import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ResultsByProjects } from '../../../api/results/results_by_projects/entities/results_by_projects.entity';

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

  @OneToMany(
    () => ResultsByProjects,
    (resultProject) => resultProject.obj_clarisa_project,
  )
  obj_results_by_projects: ResultsByProjects[];
}
