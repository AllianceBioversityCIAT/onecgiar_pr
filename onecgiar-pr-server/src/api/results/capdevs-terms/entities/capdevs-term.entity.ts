import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('capdevs_term')
export class CapdevsTerm {
    @PrimaryGeneratedColumn({
        name: 'capdev_term_id'
    })
    capdev_term_id: number;

    @Column({
        name: 'name',
        type: 'text',
        nullable: true
    })
    name!: number;

    @Column({
        name: 'term',
        type: 'text',
        nullable: true
    })
    term!: number;

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description!: number;
}
