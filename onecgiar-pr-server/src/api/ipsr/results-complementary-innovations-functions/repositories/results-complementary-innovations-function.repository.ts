import { Injectable } from "@nestjs/common";
import { HandlersError } from "src/shared/handlers/error.utils";
import { DataSource, Repository } from "typeorm";
import { ResultsComplementaryInnovationsFunction } from '../entities/results-complementary-innovations-function.entity';


@Injectable()
export class ResultsComplementaryInnovationsFunctionRepository extends Repository<ResultsComplementaryInnovationsFunction>{
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(ResultsComplementaryInnovationsFunction, dataSource.createEntityManager())
     }

    
}