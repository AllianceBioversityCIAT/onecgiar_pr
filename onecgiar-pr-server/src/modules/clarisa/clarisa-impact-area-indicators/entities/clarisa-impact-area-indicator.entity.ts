import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ClarisaImpactArea } from '../../clarisa-impact-area/entities/clarisa-impact-area.entity';

@Entity('clarisa_impact_area_indicator')
export class ClarisaImpactAreaIndicator {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({name: 'indicator_statement', type: 'text'})
    indicatorStatement: string;

    @ManyToOne(() => ClarisaImpactArea, (cia) => cia.impactAreaIndicators)
    impactArea: ClarisaImpactArea;
}
