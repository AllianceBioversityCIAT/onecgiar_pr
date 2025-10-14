import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { ClarisaActionAreaOutcome } from '../../../../clarisa/clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { ClarisaActionArea } from '../../../../clarisa/clarisa-action-areas/entities/clarisa-action-area.entity';

@Entity('results_toc_result')
export class ResultsTocResult {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'result_toc_result_id',
  })
  result_toc_result_id: number;

  @Column({
    name: 'toc_result_id',
    type: 'int',
    nullable: true,
  })
  toc_result_id!: number;

  @Column({
    name: 'results_id',
    type: 'bigint',
    nullable: true,
  })
  result_id: number;

  @ManyToOne(() => Result, (r) => r.obj_results_toc_result)
  @JoinColumn({
    name: 'results_id',
  })
  obj_results: Result;

  // ! Remove
  @ManyToOne(() => ClarisaActionAreaOutcome, (caao) => caao.id, {
    nullable: true,
  })
  @JoinColumn({
    name: 'action_area_outcome_id',
  })
  action_area_outcome_id!: number;

  @Column({
    name: 'planned_result',
    type: 'boolean',
    nullable: true,
  })
  planned_result!: boolean;

  // ! Remove
  @Column({
    name: 'action_area_id',
    type: 'int',
    nullable: true,
  })
  action_area_id: number;

  @ManyToOne(() => ClarisaActionArea, (caa) => caa.obj_results_toc_result)
  @JoinColumn({
    name: 'action_area_id',
  })
  action_areas: ClarisaActionArea;

  @Column({
    name: 'initiative_id',
    type: 'int',
    nullable: true,
  })
  initiative_ids: number;

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.id, { nullable: true })
  @JoinColumn({
    name: 'initiative_id',
  })
  initiative_id!: number;

  // TODO - Review
  @Column({
    name: 'mapping_sdg',
    type: 'boolean',
    nullable: true,
  })
  mapping_sdg: boolean;

  // TODO - Review
  @Column({
    name: 'mapping_impact',
    type: 'boolean',
    nullable: true,
  })
  mapping_impact: boolean;

  @Column({
    name: 'is_sdg_action_impact',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  is_sdg_action_impact: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column({
    type: 'text',
    name: 'toc_progressive_narrative',
    nullable: true,
  })
  toc_progressive_narrative: string;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;

  @Column({
    name: 'version_dashboard_id',
    type: 'text',
    nullable: true,
  })
  version_dashboard_id: boolean;
}
