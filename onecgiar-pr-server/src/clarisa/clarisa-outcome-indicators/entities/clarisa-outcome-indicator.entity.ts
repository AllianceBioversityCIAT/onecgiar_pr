import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_outcome_indicators')
export class ClarisaOutcomeIndicator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'smo_code',
    type: 'text',
    nullable: true,
  })
  smo_code: string;

  @Column({
    name: 'outcome_indicator_statement',
    type: 'text',
    nullable: true,
  })
  outcome_indicator_statement!: string;
}
