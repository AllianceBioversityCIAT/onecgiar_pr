import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ClarisaCountry } from '../../clarisa-countries/entities/clarisa-country.entity';
import { ClarisaRegion } from '../../clarisa-regions/entities/clarisa-region.entity';

@Entity('clarisa_countries_regions')
export class ClarisaCountriesRegion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ClarisaCountry, (ccy) => ccy.id, { nullable: true })
  @JoinColumn({
    name: 'country_id',
  })
  country_id: number;

  @ManyToOne(() => ClarisaRegion, (crn) => crn.um49Code, { nullable: true })
  @JoinColumn({
    name: 'region_code',
  })
  region_code: number;
}
