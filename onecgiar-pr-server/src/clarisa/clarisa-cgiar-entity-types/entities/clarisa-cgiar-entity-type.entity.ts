import { Column, Entity, OneToMany } from 'typeorm';
import { ClarisaInitiative } from '../../clarisa-initiatives/entities/clarisa-initiative.entity';

@Entity('clarisa_cgiar_entity_types')
export class ClarisaCgiarEntityType {
  @Column({
    name: 'code',
    type: 'bigint',
    primary: true,
  })
  code: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @OneToMany(() => ClarisaInitiative, (ci) => ci.obj_cgiar_entity_type)
  clarisa_initiative_array?: ClarisaInitiative[];
}
