import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Version } from '../../../api/versioning/entities/version.entity';
import { ClarisaInitiative } from '../../clarisa-initiatives/entities/clarisa-initiative.entity';

@Entity('clarisa_portfolios')
export class ClarisaPortfolios {
  @PrimaryColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({
    name: 'name',
    nullable: true,
    type: 'text',
  })
  name!: string;

  @Column({ name: 'start_date', nullable: true, type: 'year' })
  startDate!: number;

  @Column({ name: 'end_date', nullable: true, type: 'year' })
  endDate!: number;

  @Column({ name: 'is_active', nullable: true, type: 'tinyint' })
  isActive!: boolean;

  @Column({ name: 'acronym', nullable: true, type: 'text' })
  acronym!: string;

  @OneToMany(() => Version, (version) => version.obj_portfolio)
  obj_version: Version[];

  @OneToMany(() => ClarisaInitiative, (initiative) => initiative.obj_portfolio)
  initiatives: ClarisaInitiative[];
}
