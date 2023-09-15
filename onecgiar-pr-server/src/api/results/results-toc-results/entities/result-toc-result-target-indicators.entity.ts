import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../../../shared/entities/base-entity";
import { ClarisaSdg } from "../../../../clarisa/clarisa-sdgs/entities/clarisa-sdg.entity";
import { ClarisaSdgsTarget } from "../../../../clarisa/clarisa-sdgs-targets/entities/clarisa-sdgs-target.entity";
import { ResultsTocResult } from "./results-toc-result.entity";
import { ResultsTocResultIndicators } from "./results-toc-results-indicators.entity";

@Entity('result_indicators_targets')
export class ResultIndicatorTarget extends BaseEntity {
    @PrimaryGeneratedColumn()
    indicators_targets: number;

    @Column({
        type: 'bigint',
        name: 'number_target'
    })
    number_target: number;

    @Column({
        type: 'bigint',
        name: 'result_toc_result_indicator_id'
    })
    result_toc_result_indicator_id: number;

    @Column({
        type: 'text',
        name: 'contributing_indicator',
        nullable: true
    })
    contributing_indicator: string;

    @Column({
        type: 'boolean',
        name: 'indicator_question',
        nullable: true,
        
    })
    indicator_question: boolean;

    @ManyToOne(() => ResultsTocResultIndicators, cs => cs.result_toc_result_indicator_id, { nullable: true })
    @JoinColumn({
        name: 'result_toc_result_indicator_id'
    })
    obj_result_toc_result_indicator_id: ResultsTocResultIndicators;


}