import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaActionArea } from '../../clarisa-action-areas/entities/clarisa-action-area.entity';

@Entity('clarisa_initiatives')
export class ClarisaInitiative {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'official_code',
    type: 'text',
  })
  official_code: string;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @Column({
    name: 'short_name',
    type: 'text',
  })
  short_name: string;

  @ManyToOne(() => ClarisaActionArea, (caa) => caa.id)
  @JoinColumn({
    name: 'action_area_id',
  })
  action_area_id: number;

  @Column({
    name: 'active',
    type: 'boolean',
  })
  active: boolean;

  @Column({
    name: 'toc_id',
    type: 'text',
    nullable: true,
  })
  toc_id!: string;
}
