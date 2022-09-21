import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Inititiative {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ name: 'official_code', type: 'varchar', length: 45 })
    official_code: string;

    @Column({ name: 'name', type: 'varchar', length: 500 })
    name: string;

    @Column({ name: 'short_name', type: 'varchar', length: 100 })
    short_name: string;
}
