import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('clarisa_action_area_outcome')
export class ClarisaActionAreaOutcome {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'outcomeSMOcode',
        type: 'text',
        nullable: true
    })
    outcomeSMOcode: string;

    @Column({
        name: 'outcomeStatement',
        type: 'text',
        nullable: true
    })
    outcomeStatement: string;

}