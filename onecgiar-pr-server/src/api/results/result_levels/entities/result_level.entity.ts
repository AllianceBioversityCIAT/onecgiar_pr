import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('result_level')
export class ResultLevel {
    @PrimaryGeneratedColumn()
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
