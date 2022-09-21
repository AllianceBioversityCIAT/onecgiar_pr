import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Version {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ name: 'version_name', type: 'varchar', length: 45 })
    version_name: string;

    @Column({ name: 'start_date', type: 'varchar', length: 45 })
    start_date: string;

    @Column({ name: 'end_date', type: 'varchar', length: 45 })
    end_date: string;
}
