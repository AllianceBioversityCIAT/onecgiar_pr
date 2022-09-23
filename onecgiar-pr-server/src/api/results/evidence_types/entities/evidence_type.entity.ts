import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('evidence_types')
export class EvidenceType {
    @PrimaryGeneratedColumn({
        name: 'id',
        type: 'bigint'
    })
    id: number;

    @Column({
        name: 'name',
        type: 'varchar',
        length: 100,
        nullable: true
    })
    name!: string;

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description!: string;
}
