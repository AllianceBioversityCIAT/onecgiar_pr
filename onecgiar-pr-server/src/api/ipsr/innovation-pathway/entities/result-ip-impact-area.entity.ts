import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Ipsr } from "../../entities/ipsr.entity";
import { BaseEntity } from "../../../../shared/entities/base-entity";
import { Version } from "../../../results/versions/entities/version.entity";
import { ClarisaImpactAreaIndicator } from "../../../../clarisa/clarisa-impact-area-indicators/entities/clarisa-impact-area-indicator.entity";

@Entity('result_ip_impact_area_target')
export class ResultIpImpactArea extends BaseEntity{
    @PrimaryGeneratedColumn()
    result_ip_eoi_outcome_id: number;

    @Column({
        type: 'bigint',
        name: 'result_by_innovation_package_id'
    })
    result_by_innovation_package_id: number;

    @Column({
        type: 'bigint',
        name: 'impact_area_indicator_id'
    })
    impact_area_indicator_id: number;

    @ManyToOne(() => Ipsr, i => i.result_by_innovation_package_id)
    @JoinColumn({
        name: 'result_by_innovation_package_id'
    })
    obj_result_by_innovation_package: Ipsr;

    @ManyToOne(() => ClarisaImpactAreaIndicator, cia => cia.id)
    @JoinColumn({
        name: 'impact_area_indicator_id'
    })
    obj_impact_area_indicator: ClarisaImpactAreaIndicator;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version_result_ip_eoi_outcome: Version;
}
