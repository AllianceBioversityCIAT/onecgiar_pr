import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VersionBaseEntity } from '../../../shared/entities/version-base-entity';
import { ApplicationModules } from './application-modules.entity';
import { ClarisaPortfolios } from '../../../clarisa/clarisa-portfolios/entities/clarisa-portfolios.entity';

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
    type: 'varchar',
    length: 50,
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

  @Column({
    name: 'reporting_phase',
    type: 'bigint',
    nullable: true,
  })
  reporting_phase!: number;

  @Column({
    name: 'portfolio_id',
    type: 'int',
    nullable: true,
  })
  portfolio_id: number;

  @ManyToOne(() => Version, (v) => v.id, { nullable: true })
  @JoinColumn({ name: 'reporting_phase' })
  obj_reporting_phase: Version;

  @ManyToOne(() => ApplicationModules, (app) => app.obj_version)
  @JoinColumn({ name: 'app_module_id' })
  obj_app_module: ApplicationModules;

  @ManyToOne(() => Version, (v) => v.id)
  @JoinColumn({ name: 'previous_phase' })
  obj_previous_phase: Version;

  @ManyToOne(() => ClarisaPortfolios, (portfolio) => portfolio.obj_version)
  @JoinColumn({ name: 'portfolio_id' })
  obj_portfolio: ClarisaPortfolios;
}
