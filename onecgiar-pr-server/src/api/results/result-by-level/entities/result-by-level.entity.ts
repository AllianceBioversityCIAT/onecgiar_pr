import { Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ResultLevel } from '../../result_levels/entities/result_level.entity';
import { ResultType } from '../../result_types/entities/result_type.entity';

@Entity('result_by_level')
export class ResultByLevel {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => ResultLevel, rl => rl.id, { nullable: false })
    @JoinColumn({
        name: 'result_level_id'
    })
    result_level_id: number;

    @ManyToOne(() => ResultType, rt => rt.id, { nullable: false })
    @JoinColumn({
        name: 'result_type_id'
    })
    result_type_id: number;

}
