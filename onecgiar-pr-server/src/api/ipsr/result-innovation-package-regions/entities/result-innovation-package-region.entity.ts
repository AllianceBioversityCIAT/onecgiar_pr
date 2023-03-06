import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../../../shared/entities/base-entity";
import { ClarisaRegion } from "../../../../clarisa/clarisa-regions/entities/clarisa-region.entity";
import { ResultInnovationPackage } from "../../result-innovation-package/entities/result-innovation-package.entity";
import { Version } from "../../../../api/results/versions/entities/version.entity";

@Entity('results_innovation_package_region')
export class ResultInnovationPackageRegion extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'result_innovation_package_region_id',
        type: 'bigint'
    })
    result_innovation_package_region: number;

    @Column({
        name: 'result_innovation_package_id',
        type: 'bigint'
    })
    result_innovation_package_id: number;

    @Column({
        name: 'region_id',
        type: 'bigint'
    })
    region_id: number;

    @ManyToOne(() => ResultInnovationPackage, rip => rip.result_innovation_package_region_array, { nullable: false })
    @JoinColumn({
        name: 'result_innovation_package_id'
    })
    obj_result_innovation_package: ResultInnovationPackage;

    @ManyToOne(() => ClarisaRegion, cr => cr.result_innovation_package_region_array, { nullable: false })
    @JoinColumn({
        name: 'region_id'
    })
    obj_region: ClarisaRegion;

    @ManyToOne(() => Version, v => v.result_innovation_package_region_array)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;
}
