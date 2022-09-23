import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ResultLevel {
    @PrimaryGeneratedColumn({
        type: 'bigint'
    })
    id: number;

    @Column({
        name: 'name',
        type: 'varchar',
        length: 45,
        nullable: true
    })
    name!: string;

    @Column({
        name: 'description',
        type: 'varchar',
        length: 500,
        nullable: true
    })
    description!: string;
}
