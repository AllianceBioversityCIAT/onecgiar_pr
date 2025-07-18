import { Column, Entity, PrimaryColumn } from 'typeorm';

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
}
