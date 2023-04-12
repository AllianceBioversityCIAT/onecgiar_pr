import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { ResultsComplementaryInnovation } from '../../results-complementary-innovations/entities/results-complementary-innovation.entity';
import { ComplementaryInnovationFunctions } from './complementary-innovation-functions.entity';

@Entity('results_complementary_innovations_function')
export class ResultsComplementaryInnovationsFunction extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'results_complementary_innovations_function_id',
        type: 'bigint'
    })
    results_complementary_innovations_function_id: number;

    @Column({
        name: 'result_complementary_innovation_id',
        type: 'bigint',
        nullable: false
    })
    result_complementary_innovation_id: number;

    @Column({
        name: 'complementary_innovation_function_id',
        type: 'bigint',
        nullable: false
    })
    complementary_innovation_function_id: number;

    //

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

    @ManyToOne(() => ResultsComplementaryInnovation, rci => rci.functions)
    @JoinColumn({
        name: 'result_complementary_innovation_id'
    })
    obj_result_complementary_innovation: ResultsComplementaryInnovation;

    @ManyToOne(() => ComplementaryInnovationFunctions, cif => cif.complementary_innovation_functions_id)
    @JoinColumn({
        name: 'complementary_innovation_function_id'
    })
    obj_complementary_innovation_function: ComplementaryInnovationFunctions;
}
