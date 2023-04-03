import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../../../shared/entities/base-entity";
import { ClarisaSdg } from "../../../../clarisa/clarisa-sdgs/entities/clarisa-sdg.entity";
import { ClarisaSdgsTarget } from "../../../../clarisa/clarisa-sdgs-targets/entities/clarisa-sdgs-target.entity";
import { Ipsr } from "../../entities/ipsr.entity";

@Entity('result_ip_sdg_targets')
export class ResultIpSdgTargets extends BaseEntity {
    @PrimaryGeneratedColumn()
    result_ip_sdg_target_id: number;

    @Column({
        type: 'bigint',
        name: 'result_by_innovation_package_id',
    })
    result_by_innovation_package_id: number;

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

    @ManyToOne(() => Ipsr, i => i.result_by_innovation_package_id)
    @JoinColumn({
        name: 'result_by_innovation_package_id'
    })
    obj_result_by_innovation_package_sdg_targets: Ipsr;

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
