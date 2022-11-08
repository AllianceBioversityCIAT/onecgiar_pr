import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { TocLevel } from '../../toc-level/entities/toc-level.entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

@Entity('toc_result')
export class TocResult {

    @PrimaryGeneratedColumn({
        name: 'toc_result_id'
    })
    toc_result_id: number;

    @Column({
        name: 'toc_internal_id',
        type: 'text',
        nullable: true
    })
    toc_internal_id!: string;

    @Column({
        name: 'titel',
        type: 'text',
        nullable: true
    })
    titel: string;

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description: string;

    @ManyToOne(() => TocLevel, tl => tl.toc_level_id)
    @JoinColumn({
        name: 'toc_level_id'
    })
    toc_level_id: string;

    @Column({
        name: 'toc_type_id',
        type: 'bigint',
        nullable: true
    })
    toc_type_id!: number;

    @ManyToOne(() => ClarisaInitiative, ci => ci.id)
    @JoinColumn({
        name: 'inititiative_id'
    })
    inititiative_id: number;

    @Column({
        name: 'work_package_id',
        type: 'text',
        nullable: true
    })
    work_package_id!: string;

}
