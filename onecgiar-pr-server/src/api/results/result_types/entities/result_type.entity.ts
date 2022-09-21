import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ResultType {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ name: 'name', type: 'varchar', length: 100 })
    name: string;

    @Column({ name: 'description', type: 'varchar', length: 500 })
    description: string;
}

