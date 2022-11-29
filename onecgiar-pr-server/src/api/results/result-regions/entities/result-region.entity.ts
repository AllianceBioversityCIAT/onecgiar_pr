import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { ClarisaRegion } from '../../../../clarisa/clarisa-regions/entities/clarisa-region.entity';
import { Result } from '../../entities/result.entity';

@Entity('result_region')
export class ResultRegion {

    @PrimaryGeneratedColumn({
        type: 'bigint'
    })
    result_region_id: number;

    @ManyToOne(() => ClarisaRegion, cr => cr.um49Code)
    @JoinColumn({
        name:'region_id'
    })
    region_id: number;

    @ManyToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'result_id'
    })
    result_id: number;

    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true
    })
    is_active: boolean;

    @CreateDateColumn({
        type: 'timestamp',
        name: 'created_date'
    })
    created_date: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        name: 'last_updated_date',
        nullable: true
    })
    last_updated_date: Date;


}
