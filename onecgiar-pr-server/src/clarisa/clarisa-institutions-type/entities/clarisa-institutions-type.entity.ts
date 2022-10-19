import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_institution_types')
export class ClarisaInstitutionsType {
  @PrimaryGeneratedColumn()
  code: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;
}
