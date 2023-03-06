import { Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('result_innovation_package')
export class ResultInnovationPackage {
    @PrimaryGeneratedColumn({
        name: 'result_innovation_package_id',
        type: 'bigint'
    })
    result_innovation_package_id: number;
}
