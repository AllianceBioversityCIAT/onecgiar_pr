import { HttpStatus, Injectable } from "@nestjs/common";
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

        for (let index = 0; index < comentaryPrincipals.length; index++) {
            let subComentaries = await this.query(`
            SELECT ciet.complementary_innovation_enabler_types_id, ciet.group, ciet.type 
                FROM prdb.complementary_innovation_enabler_types ciet 
                    where ciet.type = ${comentaryPrincipals[index].complementary_innovation_enabler_types_id};`)
            for (let index = 0; index < subComentaries.length; index++) {
                let subComentariesTypeTree = await this.query(`
            SELECT ciet.complementary_innovation_enabler_types_id, ciet.group, ciet.type 
                FROM prdb.complementary_innovation_enabler_types ciet 
                    where ciet.type = ${subComentaries[index].complementary_innovation_enabler_types_id};`)
                    subComentaries[index].subCategories = subComentariesTypeTree;
            }

            comentaryPrincipals[index].subCategories = subComentaries;
            
        }

        return {
            response: {
              comentaryPrincipals
            },
            message: 'Sections have been successfully validated',
            status: HttpStatus.OK,
          };
     }

    
}