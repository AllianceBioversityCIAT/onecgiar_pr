import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_countries')
export class ClarisaCountry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @Column({
    name: 'iso_alpha_2',
    type: 'varchar',
    length: 5,
    unique: true
  })
  iso_alpha_2: string;

  @Column({
    name: 'iso_alpha_3',
    type: 'text',
  })
  iso_alpha_3: string;
}
