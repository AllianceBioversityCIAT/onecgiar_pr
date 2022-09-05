import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ClarisaActionAreasOutcomesIndicator } from '../../clarisa-action-areas-outcomes-indicators/entities/clarisa-action-areas-outcomes-indicator.entity';

@Entity('clarisa_action_area')
export class ClarisaActionArea {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({name:'name', type: "text"})
    name: string;

    @Column({name:'description', type: "text"})
    description: string;

    //Relations

    @OneToMany( () => ClarisaActionAreasOutcomesIndicator, (caaoi) => caaoi.actionArea)
    actionAreasOutcomesIndicators: ClarisaActionAreasOutcomesIndicator[];
}
