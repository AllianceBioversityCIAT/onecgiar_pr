import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('clarisa_institution_types')
export class ClarisaInstitutionsType {
  @PrimaryGeneratedColumn()
  code: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @Column({
    name: 'id_parent',
    nullable: true,
    type: 'number',
  })
  id_parent!: number;

  @Column({
    name: 'is_legacy',
    type: 'boolean',
    default: false,
  })
  is_legacy: boolean;

  @OneToMany(() => ClarisaInstitutionsType, (cit) => cit.obj_parent, {
    nullable: true,
  })
  children: ClarisaInstitutionsType[];

  @ManyToOne(() => ClarisaInstitutionsType, (cit) => cit.children, {
    nullable: true,
  })
  @JoinColumn({
    name: 'id_parent',
  })
  obj_parent: ClarisaInstitutionsType;
}
