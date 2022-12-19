import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('validation')
export class Validation{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'boolean',
        nullable: true,
        name:'section_seven'
    })
    section_seven: boolean;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'general_information'
    })
    general_information: boolean;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'theory_of_change'
    })
    theory_of_change: boolean;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'partners'
    })
    partners: boolean;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'geographic_location'
    })
    geographic_location: boolean;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'links_to_results'
    })
    links_to_results: boolean;
    
    @Column({
        type: 'boolean',
        nullable: true,
        name:'evidence'
    })
    evidence: boolean;
}