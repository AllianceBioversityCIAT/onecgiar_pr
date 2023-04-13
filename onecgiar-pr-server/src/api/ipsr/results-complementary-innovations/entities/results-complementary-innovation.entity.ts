import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Result } from '../../../results/entities/result.entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { ResultsComplementaryInnovationsFunction } from '../../results-complementary-innovations-functions/entities/results-complementary-innovations-function.entity';

@Entity('results_complementary_innovation')
export class ResultsComplementaryInnovation extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'result_complementary_innovation_id',
        type: 'bigint'
    })
    result_complementary_innovation_id: number;

    @Column({
        name: 'result_id',
        type: 'bigint',
        nullable: false
    })
    result_id: number;

    @Column({
        name: 'short_title',
        type: 'text',
        nullable: true
    })
    short_title!: string;

    @Column({
        name: 'other_funcions',
        type: 'text',
        nullable: true
    })
    other_funcions!: string;

    //

    @ManyToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'result_id'
    })
    obj_result: Result;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

    @OneToMany(() => ResultsComplementaryInnovationsFunction, cif => cif.obj_result_complementary_innovation)
    functions: ResultsComplementaryInnovationsFunction[];
}
