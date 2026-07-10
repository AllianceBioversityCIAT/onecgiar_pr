import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ClarisaCountry } from '../../clarisa-countries/entities/clarisa-country.entity';
import { ClarisaProject } from './clarisa-projects.entity';

@Entity('clarisa_project_countries')
export class ClarisaProjectCountry {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Index('IDX_clarisa_project_countries_project_id')
  @Column({ name: 'project_id', type: 'bigint' })
  projectId: number;

  @Index('IDX_clarisa_project_countries_country_id')
  @Column({ name: 'country_id', type: 'int' })
  countryId: number;

  @Column({ name: 'country_code', type: 'bigint', nullable: true })
  countryCode: number | null;

  @ManyToOne(() => ClarisaProject, (project) => project.obj_project_countries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  obj_project: ClarisaProject;

  @ManyToOne(() => ClarisaCountry, { nullable: true })
  @JoinColumn({ name: 'country_id' })
  obj_country: ClarisaCountry | null;
}
