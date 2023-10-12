import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LegacyResult } from '../../legacy-result/entities/legacy-result.entity';
import { ClarisaCountry } from '../../../../clarisa/clarisa-countries/entities/clarisa-country.entity';
import { ClarisaRegion } from '../../../../clarisa/clarisa-regions/entities/clarisa-region.entity';

@Entity('legacy_indicators_locations')
export class LegacyIndicatorsLocation {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @ManyToOne(() => LegacyResult, (r) => r.legacy_id, { nullable: true })
  @JoinColumn({
    name: 'legacy_id',
  })
  legacy_id: string;

  @Column({
    name: 'year',
    type: 'int',
    nullable: true,
  })
  year: number;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 7,
    default: '',
  })
  type: string;

  @Column({
    name: 'country_id',
    type: 'varchar',
    length: 23,
    nullable: true,
  })
  country_id: string;

  @ManyToOne(() => ClarisaCountry, (cc) => cc.iso_alpha_2, {
    nullable: true,
  })
  @JoinColumn({
    name: 'iso_alpha_2',
    referencedColumnName: 'iso_alpha_2',
  })
  iso_alpha_2: string;

  @ManyToOne(() => ClarisaRegion, (cr) => cr.um49Code, { nullable: true })
  @JoinColumn({
    name: 'um49_code',
  })
  um49_code: string;
}
