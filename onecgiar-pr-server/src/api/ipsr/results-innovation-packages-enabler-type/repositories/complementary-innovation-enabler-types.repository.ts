import { Injectable } from "@nestjs/common";
import { HandlersError } from "src/shared/handlers/error.utils";
import { DataSource, Repository } from "typeorm";
import { ComplementaryInnovationEnablerTypes } from '../entities/complementary-innovation-enabler-types.entity';


@Injectable()
export class ComplementaryInnovationEnablerTypesRepository extends Repository<ComplementaryInnovationEnablerTypes>{
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(ComplementaryInnovationEnablerTypes, dataSource.createEntityManager())
     }

     async getAllComplementaryInnovationsType(){
        let comentaryPrincipals = await this.query(`
        SELECT ciet.complementary_innovation_enabler_types_id, ciet.group, ciet.type 
            FROM prdb.complementary_innovation_enabler_types ciet 
                where ciet.type is null;`)

        comentaryPrincipals.map(async (resp) => {
            let subComentaries = await this.query(`
            SELECT ciet.complementary_innovation_enabler_types_id, ciet.group, ciet.type 
                FROM prdb.complementary_innovation_enabler_types ciet 
                    where ciet.type = ${resp.complementary_innovation_enabler_types_id};`)
            resp['subCategories'] = subComentaries;
        })
        

        return comentaryPrincipals;
     }

    
}