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
            if(createIn.hasOwnProperty('complementary_innovation_enabler_types_one')){
                createIn.complementary_innovation_enabler_types_one.forEach(async (innovation) =>{
                    let createInnovations = {
                        result_by_innovation_package_id: createIn.result_by_innovation_package_id,
                        complementary_innovation_enable_type_id: innovation.complementary_innovation_enabler_types_id,
                        is_active: true,
                        version_id: 1
                    }
                    await this.delete({result_by_innovation_package_id:createIn.result_by_innovation_package_id})
                    let aux = await this.save(createInnovations)
                    
                    returnVariable.push(aux);
                })
            }
    
            if(createIn.hasOwnProperty('complementary_innovation_enabler_types_two')){
                createIn.complementary_innovation_enabler_types_two.forEach(async (innovation) =>{
                    let createInnovations = {
                        result_by_innovation_package_id: createIn.result_by_innovation_package_id,
                        complementary_innovation_enable_type_id: innovation.complementary_innovation_enabler_types_id,
                        is_active: true,
                        version_id: 1
                    }
                    
                    let aux = await this.save(createInnovations)
                    returnVariable.push(aux);
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


     async getInnovationComplementary(id_innovation){
        const queryComplementary =   ` 
        SELECT ripet.complementary_innovation_enable_type_id as complementary_innovation_enabler_types_id,
        ciet.group, ciet.type, ciet.level
        from results_innovatio_packages_enabler_type ripet 
         join complementary_innovation_enabler_types ciet on ciet.complementary_innovation_enabler_types_id = ripet.complementary_innovation_enable_type_id 
        where ripet.result_by_innovation_package_id = ?;
        `;

        try {
            let enablers:getEnablersType[] = await this.query(queryComplementary,[id_innovation]);
            let complemetyanryLevelOne = enablers.filter(ele => ele.level != 2);
            let complemetyanryLeveltwo = enablers.filter(ele => ele.level == 2);
            complemetyanryLevelOne.map(ele =>{
                ele.subCategories = complemetyanryLeveltwo.filter((item) => item.type == ele.complementary_innovation_enabler_types_id)
            })
            
            return{
                response: {
                    result_by_innovation_package_id:id_innovation,
                    complementary_innovation_enabler_types_one:complemetyanryLevelOne,
                    complementary_innovation_enabler_types_two:complemetyanryLeveltwo,
                    
                    
                },
                message: 'Successful response',
                status: HttpStatus.OK,
                

            }            
        } catch (error) {
            throw this._handlersError.returnErrorRepository({
                className: ResultsInnovationPackagesEnablerTypeRepository.name,
                error: error,
                debug: true,
            });
        }
     }
    
}

export class getEnablersType {
    complementary_innovation_enabler_types_id: string;
    group: string;
    type: string;
    level:number;
    subCategories: any[] =new Array();
}