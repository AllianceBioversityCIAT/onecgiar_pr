import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
