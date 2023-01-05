import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Result } from '../../entities/result.entity';

@Entity('validation')
export class Validation{

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'results_id'
    })
    results_id: number;

    @Column({
        type: 'boolean',
        nullable: true,
        name:'section_seven'
    })
    section_seven: number;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'general_information'
    })
    general_information: number;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'theory_of_change'
    })
    theory_of_change: number;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'partners'
    })
    partners: number;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'geographic_location'
    })
    geographic_location: number;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'links_to_results'
    })
    links_to_results: number;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'evidence'
    })
    evidence: number;

}