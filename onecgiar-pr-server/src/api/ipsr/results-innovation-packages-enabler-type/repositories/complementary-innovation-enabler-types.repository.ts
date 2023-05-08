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

    
}