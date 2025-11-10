import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('impact_areas_scores_components')
export class ImpactAreasScoresComponent {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: false,
  })
  name: string;

  @Column({
    name: 'impact_area',
    type: 'text',
    nullable: true,
  })
  impact_area: string;

  // Campos de auditoría

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;
}
