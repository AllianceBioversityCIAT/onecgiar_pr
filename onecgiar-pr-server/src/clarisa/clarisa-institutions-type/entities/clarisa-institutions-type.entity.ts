import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from '../../../shared/entities/auditableEntity';

@Entity('institution_types')
export class ClarisaInstitutionsType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @Column({
    name: 'acronym',
    type: 'text',
    nullable: true,
  })
  acronym!: string;

  @Column({
    name: 'sub_department_active',
    type: 'int',
  })
  sub_department_active: number;

  @Column({
    name: 'old',
    type: 'int',
    nullable: true,
  })
  old: number;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;
}
