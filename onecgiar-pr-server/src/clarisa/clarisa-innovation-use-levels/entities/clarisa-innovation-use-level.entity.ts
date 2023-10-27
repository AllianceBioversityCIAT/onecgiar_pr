import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('clarisa_innovation_use_levels')
export class ClarisaInnovationUseLevel {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @Column({
    type: 'int',
    name: 'level',
    nullable: true,
  })
  level!: number;

  @Column({
    type: 'text',
    name: 'name',
    nullable: true,
  })
  name: string;

  @Column({
    name: 'definition',
    type: 'text',
    nullable: true,
  })
  definition: string;
}
