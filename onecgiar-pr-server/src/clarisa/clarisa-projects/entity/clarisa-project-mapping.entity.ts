import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ClarisaProject } from './clarisa-projects.entity';

@Entity('clarisa_project_mappings')
export class ClarisaProjectMapping {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Index('IDX_clarisa_project_mappings_project_id')
  @Column({ name: 'project_id', type: 'bigint' })
  projectId: number;

  @Index('IDX_clarisa_project_mappings_program_id')
  @Column({ name: 'program_id', type: 'bigint' })
  programId: number;

  @Column({
    name: 'program_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  programCode: string | null;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  allocation: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  complementarity: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  efficiencies: string | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @ManyToOne(() => ClarisaProject, (project) => project.obj_project_mappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  obj_project: ClarisaProject;
}
