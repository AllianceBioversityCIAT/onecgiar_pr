import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_innovation_type')
export class ClarisaInnovationType {
  @PrimaryGeneratedColumn()
  code: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @Column({
    name: 'definition',
    type: 'text',
    nullable: true,
  })
  definition: string;
}
