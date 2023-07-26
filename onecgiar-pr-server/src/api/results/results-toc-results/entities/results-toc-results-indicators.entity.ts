import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { TocResult } from '../../../../toc/toc-results/entities/toc-result.entity';
  import { Result } from '../../entities/result.entity';
  import { ClarisaActionAreaOutcome } from '../../../../clarisa/clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';
  import { Version } from '../../../versioning/entities/version.entity';
  import { User } from '../../../../auth/modules/user/entities/user.entity';
  import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
  import { ClarisaActionArea } from '../../../../clarisa/clarisa-action-areas/entities/clarisa-action-area.entity';
import { ResultsTocResult } from './results-toc-result.entity';
  
  @Entity('results_toc_result_indicators')
  export class ResultsTocResultIndicators {
    @PrimaryGeneratedColumn({
      type: 'bigint',
      name: 'result_toc_result_indicator_id',
    })
    result_toc_result_indicator_id: number;
    
    @Column({
      name: 'toc_results_indicator_id',
      type: 'text',
    })
    toc_results_indicator_id: string;


    @ManyToOne(() => ResultsTocResult, (tr) => tr.result_toc_result_id, { nullable: true })
    @Column({
      name: 'results_toc_results_id',
      type: 'bigint',
    })
    results_toc_results_id!: number;

    @Column({
      name: 'status',
      type: 'bigint',
    })
    status: number;

    @Column({
      name: 'indicator_contributing',
      type: 'text',
    })
    indicator_contributing: string;

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
  }
  