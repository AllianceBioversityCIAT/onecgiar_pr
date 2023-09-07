import { Column, Entity } from 'typeorm';

@Entity('clarisa_toc_phase')
export class ClarisaTocPhase {
  @Column({
    name: 'phase_id',
    type: 'varchar',
    length: 50,
    primary: true,
  })
  phase_id: string;

  @Column({
    name: 'name',
    type: 'text',
    nullable: false,
  })
  name: string;

  @Column({
    name: 'year',
    type: 'year',
    nullable: false,
  })
  year: number;

  @Column({
    name: 'status',
    type: 'text',
    nullable: false,
  })
  status: string;

  @Column({
    name: 'active',
    type: 'boolean',
    nullable: false,
  })
  active: boolean;
}
