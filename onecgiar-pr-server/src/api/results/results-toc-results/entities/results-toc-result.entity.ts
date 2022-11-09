import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { TocResult } from '../../../../toc/toc-results/entities/toc-result.entity';
import { Result } from '../../entities/result.entity';
import { ClarisaActionAreaOutcome } from '../../../../clarisa/clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';
import { Version } from '../../versions/entities/version.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('results_toc_result')
export class ResultsTocResult {

    @PrimaryGeneratedColumn({
        type:'bigint',
        name: 'result_toc_result_id'
    })
    result_toc_result_id: number;

    @ManyToOne(() => TocResult, tr => tr.toc_result_id)
    @JoinColumn({
        name: 'toc_result_id'
    })
    toc_result_id: number;

    @ManyToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'results_id'
    })
    results_id: number;

    @ManyToOne(() => ClarisaActionAreaOutcome, caao => caao.id, {nullable: true})
    @JoinColumn({
        name: 'action_area_outcome_id'
    })
    action_area_outcome_id!: number;

    @Column({
        name: 'planned_result',
        type: 'boolean',
        nullable: true

    })
    planned_result!: boolean;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active: boolean;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    version_id: number;

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
