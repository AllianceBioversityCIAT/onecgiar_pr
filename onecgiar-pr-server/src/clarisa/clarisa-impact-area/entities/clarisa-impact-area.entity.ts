import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ClarisaGlobalTarget } from '../../clarisa-global-target/entities/clarisa-global-target.entity';
import { ClarisaImpactAreaIndicator } from '../../clarisa-impact-area-indicators/entities/clarisa-impact-area-indicator.entity';

@Entity('clarisa_impact_areas')
export class ClarisaImpactArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'text' })
  name: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  /**     RELATIONS       **/

  @OneToMany(() => ClarisaGlobalTarget, (cgt) => cgt.id)
  globalTarget: number[];

  @OneToMany(() => ClarisaImpactAreaIndicator, (ciai) => ciai.id)
  impactAreaIndicators: number[];
}
