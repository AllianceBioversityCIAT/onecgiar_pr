import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ResultInnovationPackage } from "../../../api/ipsr/result-innovation-package/entities/result-innovation-package.entity";

@Entity('clarisa_geographic_scope')
export class ClarisaGeographicScope {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'name',
        type: 'text'
    })
    name: string;

    @Column({
        name: 'description',
        type: 'text'
    })
    description: string;

    @OneToMany(() => ResultInnovationPackage, rip => rip.obj_geo_scope)
    result_innovation_package_array: ResultInnovationPackage[];
}
