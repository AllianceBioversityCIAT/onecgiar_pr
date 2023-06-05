import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClarisaInstitutionsType } from '../../clarisa-institutions-type/entities/clarisa-institutions-type.entity';
import { ClarisaRegion } from '../../clarisa-regions/entities/clarisa-region.entity';
import { ClarisaCountry } from '../../clarisa-countries/entities/clarisa-country.entity';
import { ResultsKnowledgeProductInstitution } from '../../../api/results/results-knowledge-products/entities/results-knowledge-product-institution.entity';

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

  @Column({
    name: 'institution_type_code',
    type: 'int',
    nullable: true,
  })
  institution_type_code: number;

  @ManyToOne(() => ClarisaInstitutionsType, (cit) => cit.code)
  @JoinColumn({
    name: 'institution_type_code',
  })
  obj_institution_type_code: ClarisaInstitutionsType;

  @Column({
    name: 'headquarter_country_iso2',
    type: 'varchar',
    length: 5,
    nullable: true,
  })
  headquarter_country_iso2: number;

  @ManyToOne(() => ClarisaCountry, (cr) => cr.iso_alpha_2, { nullable: true })
  @JoinColumn({
    name: 'headquarter_country_iso2',
    referencedColumnName: 'iso_alpha_2',
  })
  obj_headquarter_country_iso2: ClarisaCountry;

  @Column({
    nullable: true,
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  is_active: boolean;

  //object relations
  @OneToMany(
    () => ResultsKnowledgeProductInstitution,
    (rkpi) => rkpi.predicted_institution_object,
  )
  result_knowledge_product_institution_array: ResultsKnowledgeProductInstitution[];

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date: Date;

  //-------------
}
