import { Injectable } from "@nestjs/common";
import { HandlersError } from "src/shared/handlers/error.utils";
import { DataSource, Repository } from "typeorm";
import { ResultIpImpactArea } from "../entities/result-ip-impact-area.entity";


@Injectable()
export class ResultIpImpactAreaRepository extends Repository<ResultIpImpactArea>{
    constructor(
        private dataSource: DataSource,
        private readonly _handlersError: HandlersError,
    ) {
        super(ResultIpImpactArea, dataSource.createEntityManager())
    }
}