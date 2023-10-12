import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaActionAreaOutcome } from './entities/clarisa-action-area-outcome.entity';

@Injectable()
export class ClarisaActionAreaOutcomeRepository extends Repository<ClarisaActionAreaOutcome> {
  constructor(private dataSource: DataSource) {
    super(ClarisaActionAreaOutcome, dataSource.createEntityManager());
  }

  async aaOutcomes() {
    const systemTrasnformationQuery = `
      SELECT
        id AS action_area_outcome_id,
        outcomeSMOcode,
        outcomeStatement,
        actionAreaId
      FROM
        clarisa_action_area_outcome
      WHERE actionAreaId = 1
      ORDER BY outcomeId ASC;
    `;
    const resilientAgrifoodSystemsQuery = `
      SELECT
        id AS action_area_outcome_id,
        outcomeSMOcode,
        outcomeStatement,
        actionAreaId
      FROM
        clarisa_action_area_outcome
      WHERE actionAreaId = 2
      ORDER BY outcomeId ASC;
    `;
    const geneticInnovationQuery = `
      SELECT
        id AS action_area_outcome_id,
        outcomeSMOcode,
        outcomeStatement,
        actionAreaId
      FROM
        clarisa_action_area_outcome
      WHERE actionAreaId = 3
      ORDER BY outcomeId ASC;
    `;

    try {
      const systemTrasnformation = await this.query(systemTrasnformationQuery);
      const resilientAgrifoodSystems = await this.query(
        resilientAgrifoodSystemsQuery,
      );
      const geneticInnovation = await this.query(geneticInnovationQuery);

      return {
        systemTrasnformation,
        resilientAgrifoodSystems,
        geneticInnovation,
      };
    } catch (error) {
      throw {
        message: `[${ClarisaActionAreaOutcomeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_action_area_outcome;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaActionAreaOutcomeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
