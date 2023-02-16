import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaCountry } from '../../../../clarisa/clarisa-countries/entities/clarisa-country.entity';

@Entity('cgspace_country_mappings')
export class CGSpaceCountryMappings {
  @PrimaryGeneratedColumn({
    name: 'cgspace_country_mapping_id',
    type: 'bigint',
  })
  cgspace_country_mapping_id: number;

  @Column({
    type: 'text',
    nullable: false,
  })
  cgspace_country_name: string;

  @Column({ nullable: false })
  clarisa_country_code: number;

  //audit fields
  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by: number;

  //object relations
  @ManyToOne(() => ClarisaCountry, (cc) => cc.cgspace_country_mapping_array)
  @JoinColumn({
    name: 'clarisa_country_code',
  })
  clarisa_country_object: ClarisaCountry;
}
