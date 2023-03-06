import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { ClarisaCenter } from '../../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaInstitution } from '../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('non_pooled_innovation_package_project')
export class NonPooledPackageProject extends BaseEntity{
    @PrimaryGeneratedColumn({
        name: 'non_pooled_package_project_id',
        type: 'bigint'
    })
    non_pooled_package_project_id: number;

    @Column({
        name: 'grant_title',
        type: 'text'
    })
    grant_title: string;

    @Column({
        name: 'center_grant_id',
        type: 'text'
    })
    center_grant_id: string;

    @Column({
        name: 'results_package_id',
        type: 'bigint'
    })
    results_package_id: number;

    @Column({
        name: 'lead_center_id',
        type: 'varchar',
        length: 15,
        nullable: true,
        charset: 'utf8',
        collation: 'utf8_unicode_ci'
    })
    lead_center_id: string;

    @Column({
        name: 'funder_institution_id',
        type: 'bigint'
    })
    funder_institution_id: boolean;

    //-------------------------

    @ManyToOne(() => ResultInnovationPackage, rip => rip.non_pooled_package_project)
    @JoinColumn({
        name: 'results_package_id'
    })
    obj_results_package: ResultInnovationPackage;

    @ManyToOne(() => ClarisaCenter, cc => cc.non_pooled_package_project)
    @JoinColumn({
        name: 'lead_center_id'
    })
    obj_lead_center: ClarisaCenter;

    @ManyToOne(() => ClarisaInstitution, ci => ci.non_pooled_package_project)
    @JoinColumn({
        name: 'funder_institution_id'
    })
    obj_funder_institution: ClarisaInstitution;

    @ManyToOne(() => Version, v => v.non_pooled_package_project)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;
}
