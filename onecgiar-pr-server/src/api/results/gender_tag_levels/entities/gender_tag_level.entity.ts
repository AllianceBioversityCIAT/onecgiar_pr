import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class GenderTagLevel {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ name: 'title', type: 'varchar', length: 45 })
    title: string;

    @Column({ name: 'description', type: 'varchar', length: 500 })
    description: string;
}
