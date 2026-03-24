import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaCgiarEntityType } from '../../clarisa-cgiar-entity-types/entities/clarisa-cgiar-entity-type.entity';
import { ClarisaPortfolios } from '../../clarisa-portfolios/entities/clarisa-portfolios.entity';
import { ClarisaGlobalUnitLineage } from './clarisa-global-unit-lineage.entity';

@Entity('clarisa_global_units')
export class ClarisaGlobalUnit {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'code', type: 'varchar', length: 80 })
  code: string;

  @Column({ name: 'name', type: 'text', nullable: true })
  name?: string | null;

  @Column({ name: 'compose_code', type: 'varchar', length: 191 })
  composeCode: string;

  @Column({ name: 'year', type: 'int', nullable: true })
  year?: number | null;

  @Column({ name: 'short_name', type: 'text', nullable: true })
  shortName?: string | null;

  @Column({ name: 'acronym', type: 'text', nullable: true })
  acronym?: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ name: 'level', type: 'int' })
  level: number;

  @Column({ name: 'entity_type_id', type: 'bigint', nullable: true })
  entityTypeId?: number | null;

  @ManyToOne(() => ClarisaCgiarEntityType, {
    nullable: true,
  })
  @JoinColumn({ name: 'entity_type_id' })
  entityType?: ClarisaCgiarEntityType | null;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId?: number | null;

  @ManyToOne(() => ClarisaGlobalUnit, (unit) => unit.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: ClarisaGlobalUnit | null;

  @OneToMany(() => ClarisaGlobalUnit, (unit) => unit.parent)
  children?: ClarisaGlobalUnit[];

  @Column({ name: 'portfolio_id', type: 'int', nullable: true })
  portfolioId?: number | null;

  @ManyToOne(() => ClarisaPortfolios, (portfolio) => portfolio.globalUnits, {
    nullable: true,
  })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio?: ClarisaPortfolios | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => ClarisaGlobalUnitLineage, (lineage) => lineage.toGlobalUnit)
  incomingLineages?: ClarisaGlobalUnitLineage[];

  @OneToMany(
    () => ClarisaGlobalUnitLineage,
    (lineage) => lineage.fromGlobalUnit,
  )
  outgoingLineages?: ClarisaGlobalUnitLineage[];
}
