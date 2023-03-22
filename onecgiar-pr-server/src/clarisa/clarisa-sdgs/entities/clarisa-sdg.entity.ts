import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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
}
