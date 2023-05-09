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

    async getImpactAreas(resultByInnovationPackageId: number) {
        const query = `
        SELECT 
            riia.impact_area_indicator_id AS targetId,
            cia.name,
            cgt.target
        FROM
            result_ip_impact_area_target riia
            LEFT JOIN clarisa_global_targets cgt ON cgt.targetId = riia.impact_area_indicator_id
            LEFT JOIN clarisa_impact_areas cia ON cia.id = cgt.impactAreaId
        WHERE riia.is_active  > 0
            AND riia.result_by_innovation_package_id = ?;
        `;
    
        try {
          const impactAreas: any[] = await this.query(query, [resultByInnovationPackageId]);
          return impactAreas;
        } catch (error) {
          throw this._handlersError.returnErrorRepository({
            className: ResultIpImpactAreaRepository.name,
            error: error,
            debug: true,
          });
        }
      }
}