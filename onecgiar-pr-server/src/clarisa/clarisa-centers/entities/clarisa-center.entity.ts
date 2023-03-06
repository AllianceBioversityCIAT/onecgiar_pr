import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { ClarisaInstitution } from '../../clarisa-institutions/entities/clarisa-institution.entity';
import { ResultsPackageCenter } from '../../../api/ipsr/results-package-centers/entities/results-package-center.entity';
import { NonPooledPackageProject } from '../../../api/ipsr/non-pooled-package-projects/entities/non-pooled-package-project.entity';

@Entity('clarisa_center')
export class ClarisaCenter {

    @PrimaryColumn({
        type: 'varchar',
        length: 15,
        name: 'code',
        primary: true,
    })
    code: string;

    @ManyToOne(() => ClarisaInstitution, ci => ci.id)
    @JoinColumn({
        name: 'institutionId'
    })
    institutionId: number;

    @Column({
        name: 'financial_code',
        type: 'text',
        nullable: true
    })
    financial_code: string;

    //-------

    @OneToMany(() => ResultsPackageCenter, rpc => rpc.obj_center)
    results_package_center: ResultsPackageCenter[];

    @OneToMany(() => NonPooledPackageProject, nppp => nppp.obj_lead_center)
    non_pooled_package_project: NonPooledPackageProject[];
}
