import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaImpactAreaIndicator } from './entities/clarisa-impact-area-indicator.entity';

@Injectable()
export class ClarisaImpactAreaInticatorsRepository extends Repository<ClarisaImpactAreaIndicator> {
  constructor(private dataSource: DataSource) {
    super(ClarisaImpactAreaIndicator, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_impact_area_indicator;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaImpactAreaInticatorsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllImpactAreaIndicators() {
    const queryData = `
    SELECT
    	ciai.id,
    	ciai.indicator_statement,
    	ciai.target_year,
    	ciai.target_unit,
    	ciai.value,
    	ciai.is_aplicable_projected_benefits,
    	ciai.impact_area_id,
    	ciai.name
    FROM
    	clarisa_impact_area_indicator ciai ;
    `;
    try {
      const AllImpactAreaIndicators = await this.query(queryData);
      return AllImpactAreaIndicators;
    } catch (error) {
      throw {
        message: `[${ClarisaImpactAreaInticatorsRepository.name}] => getAllImpactAreaIndicators error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
