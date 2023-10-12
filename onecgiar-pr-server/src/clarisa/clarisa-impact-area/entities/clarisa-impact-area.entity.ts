import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ClarisaGlobalTarget } from '../../clarisa-global-target/entities/clarisa-global-target.entity';
import { ClarisaImpactAreaIndicator } from '../../clarisa-impact-area-indicators/entities/clarisa-impact-area-indicator.entity';
import { Auditable } from '../../../shared/entities/auditableEntity';

@Entity('clarisa_impact_areas')
export class ClarisaImpactArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;

  @Column({
    name: 'financialCode',
    type: 'text',
    nullable: true,
  })
  financialCode!: string;
}
