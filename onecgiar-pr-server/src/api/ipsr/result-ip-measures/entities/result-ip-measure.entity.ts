import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import {
  PrimaryGeneratedColumn,
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { Result } from '../../../results/entities/result.entity';
import { ResultInnovSection } from '../../../results-framework-reporting/result_innov_section/entities/result_innov_section.entity';

@Entity('result_ip_measure')
export class ResultIpMeasure extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_ip_measure_id',
    type: 'bigint',
  })
  result_ip_measure_id: number;

  @Column({
    name: 'unit_of_measure',
    type: 'text',
    nullable: true,
  })
  unit_of_measure!: string;

  @Column({
    name: 'quantity',
    type: 'float',
    nullable: true,
  })
  quantity!: number;

  /**
   * Innovation Use 2026 — new users in this row (IU26-R-11). Stored, never copied across
   * phases: not in any replication insert list, so a rollover leaves it NULL.
   */
  @ApiPropertyOptional({
    description:
      'IU26-R-11: new users in this row; whole number >= 0, never above the row total (the service answers 400).',
    example: 40,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Column({
    name: 'new_users',
    type: 'int',
    unsigned: true,
    nullable: true,
    default: null,
  })
  new_users: number | null;

  @Column({
    name: 'addressing_demands',
    type: 'text',
    nullable: true,
  })
  addressing_demands!: string;

  @ManyToOne(() => ResultInnovSection)
  @JoinColumn({ name: 'section_id' })
  obj_section: ResultInnovSection;

  @Column({
    name: 'section_id',
    type: 'bigint',
    nullable: true,
  })
  section_id?: number;

  // relations

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: true,
  })
  result_id: number;

  @Column({
    name: 'result_ip_id',
    type: 'bigint',
    nullable: true,
  })
  result_ip_id: number;

  //object relations

  @ManyToOne(
    () => ResultInnovationPackage,
    (r) => r.result_innovation_package_id,
  )
  @JoinColumn({
    name: 'result_ip_id',
  })
  obj_result_ip_id: ResultInnovationPackage;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result_id: Result;
}
