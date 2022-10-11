import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('initiative_roles')
export class InitiativeRole {
    @PrimaryGeneratedColumn({
        name: 'id',
        type: 'bigint'
    })
    id: number;

    @Column({
        name: 'name',
        type: 'text',
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
