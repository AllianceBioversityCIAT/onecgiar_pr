import { Injectable } from "@nestjs/common";
import { HandlersError } from "src/shared/handlers/error.utils";
import { DataSource, Repository } from "typeorm";
import { ResultsInnovationPackagesEnablerType } from '../entities/results-innovation-packages-enabler-type.entity';


@Injectable()
export class ResultsInnovationPackagesEnablerTypeRepository extends Repository<ResultsInnovationPackagesEnablerType>{
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(ResultsInnovationPackagesEnablerType, dataSource.createEntityManager())
     }

    
}