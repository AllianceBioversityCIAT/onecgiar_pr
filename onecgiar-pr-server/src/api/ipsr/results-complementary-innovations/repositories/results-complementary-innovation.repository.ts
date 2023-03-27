import { Injectable } from "@nestjs/common";
import { HandlersError } from "src/shared/handlers/error.utils";
import { DataSource, Repository } from "typeorm";
import { ResultsComplementaryInnovation } from '../entities/results-complementary-innovation.entity';


@Injectable()
export class ResultsComplementaryInnovationRepository extends Repository<ResultsComplementaryInnovation>{
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(ResultsComplementaryInnovation, dataSource.createEntityManager())
     }

    
}