import { Column, Entity } from 'typeorm';

@Entity('legacy_result')
export class LegacyResult {
  @Column({
    name: 'indicator_type',
    type: 'text',
    nullable: true,
  })
  indicator_type!: string;

  @Column({
    name: 'year',
    type: 'int',
    nullable: true,
  })
  year!: number;

  @Column({
    name: 'crp',
    type: 'text',
    nullable: true,
  })
  crp!: string;

  @Column({
    name: 'legacy_id',
    type: 'varchar',
    length: 45,
    primary: true,
  })
  legacy_id: string;

  @Column({
    name: 'title',
    type: 'text',
    nullable: true,
  })
  title!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;

  @Column({
    name: 'geo_scope',
    type: 'text',
    nullable: true,
  })
  geo_scope!: string;

  @Column({
    name: 'detail_link',
    type: 'text',
    nullable: true,
  })
  detail_link!: string;

  @Column({
    name: 'is_migrated',
    type: 'boolean',
    nullable: true,
  })
  is_migrated!: boolean;
}
