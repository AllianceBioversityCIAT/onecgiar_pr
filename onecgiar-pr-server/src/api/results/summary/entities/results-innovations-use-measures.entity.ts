import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ResultsInnovationsUse } from './results-innovations-use.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { Version } from '../../versions/entities/version.entity';
import { UnitsOfMeasure } from '../../units-of-measure/entities/units-of-measure.entity';

@Entity('results_innovations_use_measures')
export class ResultsInnovationsUseMeasures{
    
    @PrimaryGeneratedColumn({
        name: 'result_innovations_use_measure_id'
    })
    result_innovations_use_measure_id: number;

    @ManyToOne(() => ResultsInnovationsUse, riu => riu.result_innovations_use_measure_id, {nullable: false})
    @JoinColumn({
        name: 'result_innovation_use_id'
    })
    result_innovation_use_id: number;

    @ManyToOne(() => UnitsOfMeasure, uom => uom.unit_of_measure_id, {nullable: true})
    @JoinColumn({
        name: 'unit_of_measure_id'
    })
    unit_of_measure_id!: number

    @Column({
        name: 'unit_of_measure',
        type: 'text',
        nullable: true
    })
    unit_of_measure!: string;

    @Column({
        name: 'quantity',
        type: 'float',
        nullable: false
    })
    quantity: number;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active: boolean;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    version_id: number;

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

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;
}