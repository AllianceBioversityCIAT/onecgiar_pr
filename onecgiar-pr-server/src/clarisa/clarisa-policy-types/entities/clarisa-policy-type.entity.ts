import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('clarisa_policy_type')
export class ClarisaPolicyType {

    @PrimaryGeneratedColumn({
        name: 'id'
    })
    id: number;

    @Column({
        name: 'name',
        nullable:true, 
        type: 'text'
    })
    name!: string;

    @Column({
        name: 'definition',
        nullable:true, 
        type: 'text'
    })
    definition!: string;
}
