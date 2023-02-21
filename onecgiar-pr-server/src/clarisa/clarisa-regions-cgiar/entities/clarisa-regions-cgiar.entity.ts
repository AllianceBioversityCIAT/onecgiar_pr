import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('clarisa_regions_cgiar')
export class ClarisaRegionsCgiar {
    @PrimaryGeneratedColumn({
        type: 'bigint',
        name: 'id'
    })
    id: number;

    @Column({
        type: 'bigint',
        name: 'un_code'
    })
    un_code: number;

    @Column({
        type: 'text',
        name: 'un_name'
    })
    un_name: string;

    @Column({
        type: 'bigint',
        name: 'cgiar_code'
    })
    cgiar_code: number;

    @Column({
        type: 'text',
        name: 'cgiar_name'
    })
    cgiar_name: string;
} 
