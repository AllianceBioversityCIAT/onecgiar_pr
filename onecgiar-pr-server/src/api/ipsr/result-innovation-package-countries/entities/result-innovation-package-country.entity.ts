import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ClarisaCountry } from "../../../../clarisa/clarisa-countries/entities/clarisa-country.entity";
import { BaseEntity } from "../../../../shared/entities/base-entity";
import { ResultInnovationPackage } from "../../result-innovation-package/entities/result-innovation-package.entity";
import { Version } from "../../../../api/results/versions/entities/version.entity";

@Entity('results_innovation_package_countries')
export class ResultInnovationPackageCountry extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'result_innovation_package_region_id',
        type: 'bigint'
    })
    result_innovation_package_region: number;

    @Column({
        name: 'result_innovation_package_id',
        type: 'bigint'
    })
    result_innovation_package_id: number

    @Column({
        name: 'country_id',
        type: 'bigint'
    })
    country_id: number

    @ManyToOne(() => ResultInnovationPackage, cc => cc.result_innovation_package_country_array)
    @JoinColumn({
        name: 'result_innovation_package_id'
    })
    obj_result_innovation_package: ResultInnovationPackage;

    @ManyToOne(() => ClarisaCountry, cc => cc.result_innovation_package_country_array)
    @JoinColumn({
        name: 'country_id'
    })
    obj_country: ResultInnovationPackage;

    @ManyToOne(() => Version, v => v.result_innovation_package_country_array)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;
}
