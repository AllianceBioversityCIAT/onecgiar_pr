import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('action')
export class Action {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'description',
        type: 'text'
    })
    description: string;

    @Column({
        name: 'active',
        type: 'boolean'
    })
    active: boolean;
}
