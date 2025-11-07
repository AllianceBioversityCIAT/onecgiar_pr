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
}
