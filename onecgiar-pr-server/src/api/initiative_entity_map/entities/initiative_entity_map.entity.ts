import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

@Entity('initiative_entity_map')
export class InitiativeEntityMap extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'initiative_id', type: 'int' })
  initiativeId: number;

  @Column({ name: 'entity_id', type: 'int' })
  entityId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(
    () => ClarisaInitiative,
    (initiative) => initiative.initiative_map_array,
  )
  @JoinColumn({ name: 'initiative_id' })
  initiative_obj: ClarisaInitiative;

  @ManyToOne(() => ClarisaInitiative, (entity) => entity.entity_map_array)
  @JoinColumn({ name: 'entity_id' })
  entity_obj: ClarisaInitiative;
}
