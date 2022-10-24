import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('clarisa_policy_stage')
export class ClarisaPolicyStage {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'name',
        type: 'text'
    })
    name: string;

    @Column({
        name: 'definition',
        type: 'text',
        nullable: true
    })
    definition!: string;
}
