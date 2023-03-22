import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ClarisaActionArea } from '../../../clarisa/clarisa-action-areas/entities/clarisa-action-area.entity';

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

    @ManyToOne(() => ClarisaActionArea, caa => caa.id)
    @JoinColumn({ name: 'actionAreaId' })
    actionAreaId: number;

    @Column({
        name: 'outcomeStatement',
        type: 'text',
        nullable: true
    })
    outcomeStatement: string;
}