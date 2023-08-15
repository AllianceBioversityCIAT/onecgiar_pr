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
        
        createInnovation.forEach(async (createIn)=>{
            if(createIn.hasOwnProperty('complementary_innovation_enabler_types_one')){
                if(createIn.complementary_innovation_enabler_types_one.length == 0){
                    await this.delete({result_by_innovation_package_id:createIn.result_by_innovation_package_id})
                }
                
                else{
                    await this.delete({result_by_innovation_package_id:createIn.result_by_innovation_package_id})
                    createIn.complementary_innovation_enabler_types_one.forEach(async (innovation) =>{
                        let createInnovations = {
                            result_by_innovation_package_id: createIn.result_by_innovation_package_id,
                            complementary_innovation_enable_type_id: innovation,
                            is_active: true,
                        }
                        await this.save(createInnovations)
                })
               }
            }
    
            if(createIn.hasOwnProperty('complementary_innovation_enabler_types_two')){
                createIn.complementary_innovation_enabler_types_two.forEach(async (innovation) =>{
                    let createInnovations = {
                        result_by_innovation_package_id: createIn.result_by_innovation_package_id,
                        complementary_innovation_enable_type_id: innovation,
                        is_active: true,
                    }
                    await this.save(createInnovations)
                })
            }
        })
        
        console.log(returnVariable);
        

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
        SELECT
            rbip.result_by_innovation_package_id,
        	rbip.result_id,
        	r.result_code,
        	r.title,
        	r.description,
        	(select   GROUP_CONCAT(
                    DISTINCT concat(ripet.complementary_innovation_enable_type_id) separator ';'
                )
        		from results_innovatio_packages_enabler_type ripet
                    join complementary_innovation_enabler_types ciet on ripet.complementary_innovation_enable_type_id = ciet.complementary_innovation_enabler_types_id
        		where ripet.result_by_innovation_package_id = rbip.result_by_innovation_package_id and
                ciet.level = 1
        		) as complementary_enablers_one,
            
                (select   GROUP_CONCAT(
                    DISTINCT concat(ripet.complementary_innovation_enable_type_id) separator ';'
                )
        		from results_innovatio_packages_enabler_type ripet 
                join complementary_innovation_enabler_types ciet on ripet.complementary_innovation_enable_type_id = ciet.complementary_innovation_enabler_types_id
        		where ripet.result_by_innovation_package_id = rbip.result_by_innovation_package_id and
                ciet.level = 2
        		) as complementary_enablers_two
        FROM
        	result_by_innovation_package rbip
        inner join \`result\` r on
        	r.id = rbip.result_id
        	and r.is_active = true
        where
        	rbip.result_innovation_package_id = ?
            and rbip.ipsr_role_id = 2
        	and rbip.is_active = true;
        `;

        try {
            let enablers:getEnablersType[] = await this.query(queryComplementary,[id_innovation]);

            return{
                response: {
                    results:enablers
                    
                    
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