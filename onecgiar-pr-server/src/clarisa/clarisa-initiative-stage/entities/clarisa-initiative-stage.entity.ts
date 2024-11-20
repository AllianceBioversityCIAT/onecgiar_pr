import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ClarisaInitiative } from '../../clarisa-initiatives/entities/clarisa-initiative.entity';

@Entity('clarisa_initiative_stages')
export class ClarisaInitiativeStage {
  @Column({
    name: 'id',
    type: 'bigint',
    nullable: false,
    primary: true,
  })
  id: number;

  @Column({
    name: 'stage_id',
    type: 'int',
    nullable: false,
  })
  stage_id: number;

  @Column({
    name: 'active',
    type: 'boolean',
    nullable: false,
  })
  active: boolean;

  // relations

  @Column({
    name: 'initiative_id',
    type: 'int',
    nullable: false,
  })
  initiative_id: number;

  // object relations

  @ManyToOne(() => ClarisaInitiative, (ci) => ci.initiative_stage_array)
  @JoinColumn({ name: 'initiative_id' })
  initiative_object: ClarisaInitiative;
}
