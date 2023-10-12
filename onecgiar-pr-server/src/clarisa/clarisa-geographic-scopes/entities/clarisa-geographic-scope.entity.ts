import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_geographic_scope')
export class ClarisaGeographicScope {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
  })
  description: string;
}
