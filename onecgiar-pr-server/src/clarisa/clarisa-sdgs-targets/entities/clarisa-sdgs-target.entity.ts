import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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
}
