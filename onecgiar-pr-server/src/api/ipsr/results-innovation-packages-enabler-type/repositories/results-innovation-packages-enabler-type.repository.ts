import { HttpStatus, Injectable } from "@nestjs/common";
import { HandlersError } from "src/shared/handlers/error.utils";
import { DataSource, Repository } from "typeorm";
import { ResultsInnovationPackagesEnablerType } from '../entities/results-innovation-packages-enabler-type.entity';
import { CreateResultsInnovationPackagesEnablerTypeDto } from "../dto/create-results-innovation-packages-enabler-type.dto";


@Injectable()
export class ResultsInnovationPackagesEnablerTypeRepository extends Repository<ResultsInnovationPackagesEnablerType>{
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(ResultsInnovationPackagesEnablerType, dataSource.createEntityManager())
     }

     createResultInnovationPackages(createInnovation: CreateResultsInnovationPackagesEnablerTypeDto[]){

        let returnVariable = [];
        
        createInnovation.forEach((createIn)=>{
            if(createIn.complementary_innovation_enabler_types_one.length != 0){
                createIn.complementary_innovation_enabler_types_one.forEach(async (innovation) =>{
                    let createInnovations = {
                        result_by_innovation_package_id: createIn.result_by_innovation_package_id,
                        complementary_innovation_enable_type_id: innovation.complementary_innovation_enabler_types_id,
                        is_active: true,
                        version_id: 1
                    }
                    returnVariable.push(await this.save(createInnovations));
                })
            }
    
            if(createIn.complementary_innovation_enabler_types_two.length != 0){
                createIn.complementary_innovation_enabler_types_two.forEach(async (innovation) =>{
                    let createInnovations = {
                        result_by_innovation_package_id: createIn.result_by_innovation_package_id,
                        complementary_innovation_enable_type_id: innovation.complementary_innovation_enabler_types_id,
                        is_active: true,
                        version_id: 1
                    }
                    returnVariable.push(await this.save(createInnovations));
                })
            }
        })
        
        

        return {
            response: {
                returnVariable
            },
            message: 'Sections have been successfully validated',
            status: HttpStatus.OK,
          };
     }
    
}