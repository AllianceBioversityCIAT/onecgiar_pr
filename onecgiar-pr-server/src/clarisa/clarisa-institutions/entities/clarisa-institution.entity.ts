import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaInstitutionsType } from '../../clarisa-institutions-type/entities/clarisa-institutions-type.entity';

@Entity('clarisa_institutions')
export class ClarisaInstitution {
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
    name: 'website_link',
    type: 'text',
    nullable: true,
  })
  website_link!: string;

  @ManyToOne(() => ClarisaInstitutionsType, (cit) => cit.id)
  @JoinColumn({
    name: 'institution_type_id',
  })
  institution_type_id: number;

  @Column({
    name: 'parent_id',
    type: 'int',
    nullable: true,
  })
  parent_id!: number;

  @Column({
    name: 'is_parent',
    type: 'boolean',
    nullable: true,
  })
  is_parent!: boolean;
}
