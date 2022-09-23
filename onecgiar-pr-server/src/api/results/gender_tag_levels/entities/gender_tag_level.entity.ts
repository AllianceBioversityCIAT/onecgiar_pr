import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class GenderTagLevel {
    @PrimaryGeneratedColumn({
        name: 'id',
        type: 'bigint'
    })
    id: number;

    @Column({
        name: 'title',
        type: 'varchar',
        length: 45,
        nullable: true
    })
    title!: string;

    @Column({
        name: 'description',
        type: 'varchar',
        length: 500,
        nullable: true
    })
    description!: string;
}
