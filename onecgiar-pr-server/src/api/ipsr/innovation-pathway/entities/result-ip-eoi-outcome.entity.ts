import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Ipsr } from "../../entities/ipsr.entity";
import { TocResult } from "../../../../toc/toc-results/entities/toc-result.entity";
import { BaseEntity } from "../../../../shared/entities/base-entity";
import { Version } from "../../../results/versions/entities/version.entity";

@Entity('result_ip_eoi_outcomes')
export class ResultIpEoiOutcome extends BaseEntity{
    @PrimaryGeneratedColumn()
    result_ip_eoi_outcome_id: number;

    @Column({
        type: 'bigint',
        name: 'result_by_innovation_package_id'
    })
    result_by_innovation_package_id: number;

    @Column({
        type: 'bigint',
        name: 'toc_result_id'
    })
    toc_result_id: number;

    @ManyToOne(() => Ipsr, i => i.result_by_innovation_package_id)
    @JoinColumn({
        name: 'result_by_innovation_package_id'
    })
    obj_result_by_innovation_package: Ipsr;

    @ManyToOne(() => TocResult, tr => tr.toc_result_id)
    @JoinColumn({
        name: 'toc_result_id'
    })
    obj_toc_result: TocResult;

    @ManyToOne(() => Version, v => v.obj_version_result_ip_eoi_outcome)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version_result_ip_eoi_outcome: Version;
}
