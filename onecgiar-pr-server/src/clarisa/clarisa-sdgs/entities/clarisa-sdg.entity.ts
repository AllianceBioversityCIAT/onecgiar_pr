import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ResultIpSdgTargets } from "../../../api/ipsr/innovation-pathway/entities/result-ip-sdg-targets.entity";

@Entity('clarisa_sdgs')
export class ClarisaSdg {
    @PrimaryGeneratedColumn({
        type: 'bigint',
        name: 'usnd_code'
    })
    usnd_code: number;

    @Column({
        type: 'varchar',
        length: 400,
        name: 'financial_code'
    })
    financial_code: string;

    @Column({
        type: 'varchar',
        length: 400,
        name: 'full_name'
    })
    full_name: string;

    @Column({
        type: 'varchar',
        length: 100,
        name: 'short_name'
    })
    short_name: string;

    @OneToMany(() => ResultIpSdgTargets, ris => ris.obj_clarisa_sdg_usnd_code)
    obj_clarisa_sdg_usnd_code: ResultIpSdgTargets[];
}
