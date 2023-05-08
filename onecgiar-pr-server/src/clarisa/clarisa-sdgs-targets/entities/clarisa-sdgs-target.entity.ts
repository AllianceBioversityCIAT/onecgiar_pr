import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ResultIpSdgTargets } from "../../../api/ipsr/innovation-pathway/entities/result-ip-sdg-targets.entity";

@Entity('clarisa_sdgs_targets')
export class ClarisaSdgsTarget {
    @PrimaryGeneratedColumn({
        type: 'bigint',
        name: 'id'
    })
    id: number;

    @Column({
        type:'varchar',
        length: 5,
        name: 'sdg_target_code'
    })
    sdg_target_code: string;

    @Column({
        type:'text',
        name: 'sdg_target'
    })
    sdg_target: string;

    @Column({
        type:'bigint',
        name: 'usnd_code'
    })
    usnd_code: number;

    @OneToMany(() => ResultIpSdgTargets, ris => ris.obj_clarisa_sdg_target)
    obj_clarisa_sdg_target: ResultIpSdgTargets[];
}
