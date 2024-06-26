import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ClarisaActionArea } from '../../clarisa-action-areas/entities/clarisa-action-area.entity';
import { ClarisaCgiarEntityType } from '../../clarisa-cgiar-entity-types/entities/clarisa-cgiar-entity-type.entity';

@Entity('clarisa_initiatives')
export class ClarisaInitiative {
  @Column({
    name: 'id',
    type: 'int',
    nullable: false,
    primary: true,
  })
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

  @Column({
    name: 'cgiar_entity_type_id',
    type: 'bigint',
    nullable: true,
  })
  cgiar_entity_type_id!: number;

  @ManyToOne(
    () => ClarisaCgiarEntityType,
    (cet) => cet.clarisa_initiative_array,
  )
  @JoinColumn({
    name: 'cgiar_entity_type_id',
  })
  obj_cgiar_entity_type?: ClarisaCgiarEntityType;
}
