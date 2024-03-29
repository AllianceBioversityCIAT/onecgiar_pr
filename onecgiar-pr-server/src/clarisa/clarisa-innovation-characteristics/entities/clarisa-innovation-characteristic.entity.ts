import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_innovation_characteristic')
export class ClarisaInnovationCharacteristic {
  @PrimaryGeneratedColumn()
  id: number;

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
  definition!: string;
}
