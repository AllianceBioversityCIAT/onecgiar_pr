import { ManyToOne, JoinColumn, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { InitiativeRole } from '../../../results/initiative_roles/entities/initiative_role.entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';

@Entity('results_innovation_package_by_initiative')
export class ResultsPackageByInitiative extends BaseEntity {

    @PrimaryGeneratedColumn({
        name: 'results_package_by_initiative_id',
        type: 'bigint'
    })
    results_package_by_initiative_id: number;

    @Column({
        name: 'initiative_id',
        type: 'bigint'
    })
    initiative_id: number;

    @Column({
        name: 'initiative_role_id',
        type: 'bigint'
    })
    initiative_role_id: number;

    @Column({
        name: 'results_package_id',
        type: 'bigint'
    })
    results_package_id: number;

    //---------------------------

    @ManyToOne(() => ResultInnovationPackage, rip => rip.results_package_by_initiative)
    @JoinColumn({
        name: 'results_package_id'
    })
    obj_results_package: ResultInnovationPackage;

    @ManyToOne(() => InitiativeRole, ir => ir.results_package_by_initiative)
    @JoinColumn({
        name: 'initiative_role_id'
    })
    obj_initiative_role: InitiativeRole;

    @ManyToOne(() => ClarisaInitiative, ci => ci.results_package_by_initiative)
    @JoinColumn({
        name: 'initiative_id'
    })
    obj_initiative: ClarisaInitiative;

    @ManyToOne(() => Version, v => v.results_package_by_initiative)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;
}
