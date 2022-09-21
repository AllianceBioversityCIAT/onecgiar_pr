import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class InstitutionRole {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ name: 'name', type: 'varchar', length: 50 })
    name: string;
}
