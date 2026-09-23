import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Result } from '../../entities/result.entity';
import { ClarisaProject } from '../../../../clarisa/clarisa-projects/entity/clarisa-projects.entity';

@Entity('results_by_projects')
export class ResultsByProjects extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', nullable: false })
  result_id: number;

  @Column({ type: 'bigint', nullable: false })
  project_id: number;

  @ManyToOne(() => Result, (r) => r.obj_result_by_project)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result_project: Result;

  @ManyToOne(() => ClarisaProject, (r) => r.obj_results_by_projects, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'project_id' })
  obj_clarisa_project: ClarisaProject;

  @Column({ type: 'boolean', nullable: true, default: false })
  is_lead: boolean;

  /**
   * P2-3760 — share of this result attributed to the project, as a percentage.
   * NULL means the question was never answered; the form renders that as 100, so rows
   * written before the column existed keep reading correctly. Stored as a string because
   * TypeORM maps MySQL `decimal` that way.
   */
  @Column({
    name: 'contribution_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  contribution_percentage: string | null;
}
