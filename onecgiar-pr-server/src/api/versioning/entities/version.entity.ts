import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ipsr } from '../../ipsr/entities/ipsr.entity';
import { NonPooledProject } from '../../results/non-pooled-projects/entities/non-pooled-project.entity';
import { ResultsCenter } from '../../results/results-centers/entities/results-center.entity';
import { ResultActor } from '../../results/result-actors/entities/result-actor.entity';
import { ResultIpEoiOutcome } from '../../ipsr/innovation-pathway/entities/result-ip-eoi-outcome.entity';
import { ResultIpAAOutcome } from '../../ipsr/innovation-pathway/entities/result-ip-action-area-outcome.entity';
import { ResultsIpActor } from '../../ipsr/results-ip-actors/entities/results-ip-actor.entity';
import { VersionBaseEntity } from '../../../shared/entities/version-base-entity';
import { ApplicationModules } from './application-modules.entity';

@Entity('version')
export class Version extends VersionBaseEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'phase_name',
    type: 'text',
    nullable: false,
  })
  phase_name: string;

  @Column({
    name: 'start_date',
    type: 'text',
    nullable: true,
  })
  start_date!: string;

  @Column({
    name: 'end_date',
    type: 'text',
    nullable: true,
  })
  end_date!: string;

  @Column({
    name: 'toc_pahse_id',
    type: 'bigint',
    nullable: true,
  })
  toc_pahse_id: number;

  @Column({
    name: 'cgspace_year',
    type: 'year',
    nullable: true,
  })
  cgspace_year: number;

  @Column({
    name: 'phase_year',
    type: 'year',
    nullable: true,
  })
  phase_year: number;

  @Column({
    name: 'status',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  status: boolean;

  @Column({
    name: 'previous_phase',
    type: 'bigint',
    nullable: true,
  })
  previous_phase: number;

  @Column({
    name: 'app_module_id',
    type: 'bigint',
    nullable: true,
  })
  app_module_id: number;

  @ManyToOne(() => ApplicationModules, (app) => app.obj_version)
  @JoinColumn({ name: 'app_module_id' })
  obj_app_module: ApplicationModules;

  @ManyToOne(() => Version, (v) => v.id)
  @JoinColumn({ name: 'previous_phase' })
  obj_previous_phase: Version;
}
