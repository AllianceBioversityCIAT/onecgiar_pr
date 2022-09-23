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
        type: 'varchar',
        length: 45,
        nullable: true
    })
    name!: string;

    @Column({
        name: 'description',
        type: 'varchar',
        length: 45,
        nullable: true
    })
    description!: string;
}
