import { Column, Entity, PrimaryGeneratedColumn, JoinColumn, ManyToOne, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { consensusInitiativeWorkPackage } from './consensus-initiative-work-package.entity';
import { RelevantCountry } from './relevant-country.entity';
import { RegionalLeadership } from './regional-leadership.entity';
import { RegionalIntegrated } from './regional-integrated.entity';
import { ActiveBackstopping } from './active-backstopping.entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { Result } from '../../../results/entities/result.entity';
import { Ipsr } from '../../entities/ipsr.entity';
import { ResultsInnovationPackagesEnablerType } from '../../results-innovation-packages-enabler-type/entities/results-innovation-packages-enabler-type.entity';
import { ClarisaInnovationReadinessLevel } from '../../../../clarisa/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';

@Entity('result_innovation_package')
export class ResultInnovationPackage extends BaseEntity{
    @Column({
        name: 'result_innovation_package_id',
        type: 'bigint',
        primary: true
    })
    result_innovation_package_id: number;

    @Column({
        name: 'experts_is_diverse',
        type: 'boolean',
        nullable: true
    })
    experts_is_diverse!: boolean;

    @Column({
        name: 'is_not_diverse_justification',
        type: 'text',
        nullable: true
    })
    is_not_diverse_justification!: string;    

    @Column({
        name: 'consensus_initiative_work_package_id',
        type: 'int',
        nullable: true
    })
    consensus_initiative_work_package_id!: number;
    
    @Column({
        name: 'relevant_country_id',
        type: 'int',
        nullable: true
    })
    relevant_country_id!: number;

    @Column({
        name: 'regional_leadership_id',
        type: 'int',
        nullable: true
    })
    regional_leadership_id!: number;

    @Column({
        name: 'regional_integrated_id',
        type: 'int',
        nullable: true
    })
    regional_integrated_id!: number;

    @Column({
        name: 'active_backstopping_id',
        type: 'int',
        nullable: true
    })
    active_backstopping_id!: number;

    @Column({
        name: 'use_level_evidence_based',
        type: 'bigint',
        nullable: true
    })
    use_level_evidence_based!: number;

    @Column({
        name: 'readiness_level_evidence_based',
        type: 'bigint',
        nullable: true
    })
    readiness_level_evidence_based!: number;

    @Column({
        name: 'is_expert_workshop_organized',
        type: 'boolean',
        nullable: true
    })
    is_expert_workshop_organized!: boolean;

    @ManyToOne(() => consensusInitiativeWorkPackage , ciwp => ciwp.consensus_initiative_work_package_id, {nullable: true})
    @JoinColumn({
        name: 'consensus_initiative_work_package_id'
    })
    obj_consensus_initiative_work_package!: consensusInitiativeWorkPackage;
    
    @ManyToOne(() => RelevantCountry, rc => rc.relevant_country_id, {nullable: true})
    @JoinColumn({
        name: 'relevant_country_id'
    })
    obj_relevant_country!: RelevantCountry;

    @ManyToOne(() => RegionalLeadership, rl => rl.regional_leadership_id, {nullable: true})
    @JoinColumn({
        name: 'regional_leadership_id'
    })
    obj_regional_leadership!: RegionalLeadership;

    @ManyToOne(() => RegionalIntegrated, ri => ri.regional_integrated_id, {nullable: true})
    @JoinColumn({
        name: 'regional_integrated_id'
    })
    obj_regional_integrated!: RegionalIntegrated;

    @ManyToOne(() => ActiveBackstopping, ab => ab.active_backstopping_id, {nullable: true})
    @JoinColumn({
        name: 'active_backstopping_id'
    })
    obj_active_backstopping!: ActiveBackstopping;

    @ManyToOne(() => Version, v => v.id)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;
    
    @OneToOne(() => Result, r => r.id)
    @JoinColumn({
        name: 'result_innovation_package_id'
    })
    obj_result_innovation_package: Result;

    @OneToMany(() => Ipsr, (i) => i.obj_result_by_innovation_package)
    obj_result: Ipsr[];

    @OneToMany(() => ResultsInnovationPackagesEnablerType, ripet => ripet.obj_result_by_innovation_package)
    children_innovation_packages_enabler_type: ResultsInnovationPackagesEnablerType[];

    @ManyToOne(() => ClarisaInnovationReadinessLevel, cirl => cirl.id)
    @JoinColumn({
        name: 'use_level_evidence_based'
    })
    obj_use_level_evidence_based: ClarisaInnovationReadinessLevel;

    @ManyToOne(() => ClarisaInnovationReadinessLevel, cirl => cirl.id)
    @JoinColumn({
        name: 'readiness_level_evidence_based'
    })
    obj_readiness_level_evidence_based: ClarisaInnovationReadinessLevel;
}
