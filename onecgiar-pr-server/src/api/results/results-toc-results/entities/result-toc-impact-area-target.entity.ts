import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  import { BaseEntity } from '../../../../shared/entities/base-entity';
  import { Version } from '../../../versioning/entities/version.entity';
  import { ClarisaImpactAreaIndicator } from '../../../../clarisa/clarisa-impact-area-indicators/entities/clarisa-impact-area-indicator.entity';
  import { ClarisaGlobalTarget } from '../../../../clarisa/clarisa-global-target/entities/clarisa-global-target.entity';
import { ResultsTocResult } from './results-toc-result.entity';
  
  @Entity('result_toc_impact_area_target')
  export class ResultIpImpactArea extends BaseEntity {
    @PrimaryGeneratedColumn()
    result_toc_impact_area_id: number;
  
    @Column({
        type: 'bigint',
        name: 'result_by_innovation_package_id',
    })
    result_toc_result_id: number;
  
    @Column({
      type: 'bigint',
      name: 'impact_area_indicator_id',
    })
    impact_area_indicator_id: number;
  
    @ManyToOne(() => ResultsTocResult, (tr) => tr.result_toc_result_id, { nullable: true })
    @JoinColumn({
      name: 'results_toc_results_id',
    })
    results_toc_results!: ResultsTocResult;
    
    @ManyToOne(() => ClarisaGlobalTarget, (cia) => cia.targetId)
    @JoinColumn({
      name: 'impact_area_indicator_id',
    })
    obj_impact_area_indicator: ClarisaGlobalTarget;
  }
  