import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../../../shared/entities/base-entity";
import { ClarisaSdg } from "../../../../clarisa/clarisa-sdgs/entities/clarisa-sdg.entity";
import { ClarisaSdgsTarget } from "../../../../clarisa/clarisa-sdgs-targets/entities/clarisa-sdgs-target.entity";
import { ResultsTocResult } from "./results-toc-result.entity";


@Entity('result_toc_sdg_targets')
export class ResultTocSdgTargets extends BaseEntity {
    @PrimaryGeneratedColumn()
    result_toc_sdg_target_id: number;

    @Column({
        type: 'bigint',
        name: 'result_toc_result_id',
    })
    result_toc_result_id: number;

    @Column({
        type: 'bigint',
        name: 'clarisa_sdg_usnd_code'
    })
    clarisa_sdg_usnd_code: number;

    @Column({
        type: 'bigint',
        name: 'clarisa_sdg_target_id'
    })
    clarisa_sdg_target_id: number;

    @ManyToOne(() => ResultsTocResult, (tr) => tr.result_toc_result_id, { nullable: true })
    @JoinColumn({
      name: 'result_toc_result_id',
    })
    results_toc_results!: ResultsTocResult;

    @ManyToOne(() => ClarisaSdg, cs => cs.usnd_code)
    @JoinColumn({
        name: 'clarisa_sdg_usnd_code'
    })
    obj_clarisa_sdg_usnd_code: ClarisaSdg;

    @ManyToOne(() => ClarisaSdgsTarget, cs => cs.usnd_code)
    @JoinColumn({
        name: 'clarisa_sdg_target_id'
    })
    obj_clarisa_sdg_target: ClarisaSdgsTarget;
}

