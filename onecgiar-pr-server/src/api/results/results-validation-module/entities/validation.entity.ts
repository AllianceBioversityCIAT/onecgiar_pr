import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';

@Entity('validation')
export class Validation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'results_id',
  })
  results_id: number;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'section_seven',
  })
  section_seven: number;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'general_information',
  })
  general_information: number;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'theory_of_change',
  })
  theory_of_change: number;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'partners',
  })
  partners: number;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'geographic_location',
  })
  geographic_location: number;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'links_to_results',
  })
  links_to_results: number;

  @Column({
    type: 'boolean',
    nullable: true,
    name: 'evidence',
  })
  evidence: number;

  @Column({
    name: 'is_active',
    nullable: false,
    type: 'boolean',
    default: true,
  })
  is_active!: boolean;

  @CreateDateColumn({
    name: 'created_date',
    nullable: true,
    type: 'timestamp',
  })
  created_date: Date;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;
}
