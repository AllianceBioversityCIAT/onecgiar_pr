import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsInnovationsDev } from '../entities/results-innovations-dev.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import { InnovationDevelopmentDto } from '../dto/innovation-development.dto';

@Injectable()
export class ResultsInnovationsDevRepository
  extends BaseRepository<ResultsInnovationsDev>
  implements LogicalDelete<ResultsInnovationsDev>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsInnovationsDev>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
      null as result_innovation_dev_id,
      rid.short_title,
      rid.is_new_variety,
      rid.number_of_varieties,
      rid.innovation_developers,
      rid.innovation_collaborators,
      rid.readiness_level,
      rid.evidences_justification,
      rid.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as results_id,
      ${config.user.id} as created_by,
      null as last_updated_by,
      rid.innovation_characterization_id,
      rid.innovation_nature_id,
      rid.innovation_readiness_level_id,
      rid.innovation_acknowledgement,
      rid.innovation_pdf,
      rid.innovation_user_to_be_determined
      from results_innovations_dev rid where rid.results_id = ${
        config.old_result_id
      } and rid.is_active > 0
      `,
      insertQuery: `
      insert into results_innovations_dev
      (
      short_title,
      is_new_variety,
      number_of_varieties,
      innovation_developers,
      innovation_collaborators,
      readiness_level,
      evidences_justification,
      is_active,
      created_date,
      last_updated_date,
      results_id,
      created_by,
      last_updated_by,
      innovation_characterization_id,
      innovation_nature_id,
      innovation_readiness_level_id,
      innovation_acknowledgement,
      innovation_pdf,
      innovation_user_to_be_determined
      )
      select 
      rid.short_title,
      rid.is_new_variety,
      rid.number_of_varieties,
      rid.innovation_developers,
      rid.innovation_collaborators,
      rid.readiness_level,
      rid.evidences_justification,
      rid.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as results_id,
      ${config.user.id} as created_by,
      null as last_updated_by,
      rid.innovation_characterization_id,
      rid.innovation_nature_id,
      rid.innovation_readiness_level_id,
      rid.innovation_acknowledgement,
      rid.innovation_pdf,
      rid.innovation_user_to_be_determined
      from results_innovations_dev rid where rid.results_id = ${
        config.old_result_id
      } and rid.is_active > 0`,
      returnQuery: `
      select 
      rid.*
      from results_innovations_dev rid where rid.results_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsInnovationsDevRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsInnovationsDev, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rid from results_innovations_dev rid where rid.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInnovationsDevRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsInnovationsDev> {
    const queryData = `update results_innovations_dev set is_active = 0 where results_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInnovationsDevRepository.name,
          debug: true,
        }),
      );
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsInnovationsDev>,
  ): Promise<ResultsInnovationsDev[]> {
    let final_data: ResultsInnovationsDev[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
        null as result_innovation_dev_id,
        rid.short_title,
        rid.is_new_variety,
        rid.number_of_varieties,
        rid.innovation_developers,
        rid.innovation_collaborators,
        rid.readiness_level,
        rid.evidences_justification,
        rid.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ? as results_id,
        ? as created_by,
        null as last_updated_by,
        rid.innovation_characterization_id,
        rid.innovation_nature_id,
        rid.innovation_readiness_level_id,
        rid.innovation_acknowledgement,
        rid.innovation_pdf
        from results_innovations_dev rid where rid.results_id = ? and rid.is_active > 0
        `;
        const response = await (<Promise<ResultsInnovationsDev[]>>(
          this.query(queryData, [
            config.new_result_id,
            config.user.id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultsInnovationsDev[]>(
          config.f.custonFunction(response)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
        insert into results_innovations_dev
        (
        short_title,
        is_new_variety,
        number_of_varieties,
        innovation_developers,
        innovation_collaborators,
        readiness_level,
        evidences_justification,
        is_active,
        created_date,
        last_updated_date,
        results_id,
        created_by,
        last_updated_by,
        innovation_characterization_id,
        innovation_nature_id,
        innovation_readiness_level_id,
        innovation_acknowledgement,
        innovation_pdf
        )
        select 
        rid.short_title,
        rid.is_new_variety,
        rid.number_of_varieties,
        rid.innovation_developers,
        rid.innovation_collaborators,
        rid.readiness_level,
        rid.evidences_justification,
        rid.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ? as results_id,
        ? as created_by,
        null as last_updated_by,
        rid.innovation_characterization_id,
        rid.innovation_nature_id,
        rid.innovation_readiness_level_id,
        rid.innovation_acknowledgement,
        rid.innovation_pdf
        from results_innovations_dev rid where rid.results_id = ? and rid.is_active > 0`;
        await this.query(queryData, [
          config.new_result_id,
          config.user.id,
          config.old_result_id,
        ]);

        const queryFind = `
        select 
        rid.result_innovation_dev_id,
        rid.short_title,
        rid.is_new_variety,
        rid.number_of_varieties,
        rid.innovation_developers,
        rid.innovation_collaborators,
        rid.readiness_level,
        rid.evidences_justification,
        rid.is_active,
        rid.created_date,
        rid.last_updated_date,
        rid.results_id,
        rid.created_by,
        rid.last_updated_by,
        rid.innovation_characterization_id,
        rid.innovation_nature_id,
        rid.innovation_readiness_level_id,
        rid.innovation_acknowledgement,
        rid.innovation_pdf
        from results_innovations_dev rid where rid.results_id = ?`;
        final_data = await this.query(queryFind, [config.new_result_id]);
      }
    } catch (error) {
      if (config.f?.errorFunction) {
        config.f.errorFunction(error);
      } else {
        this._logger.error(error);
      }

      final_data = null;
    }

    config.f?.completeFunction?.({ ...final_data });

    return final_data;
  }

  async InnovationDevExists(resultId: number) {
    const queryData = `
    SELECT
      rid.result_innovation_dev_id,
      rid.short_title,
      rid.is_new_variety,
      rid.number_of_varieties,
      rid.innovation_developers,
      rid.innovation_collaborators,
      rid.readiness_level,
      rid.evidences_justification,
      rid.is_active,
      rid.created_date,
      rid.last_updated_date,
      rid.results_id,
      rid.created_by,
      rid.last_updated_by,
      rid.innovation_characterization_id,
      rid.innovation_nature_id,
      rid.innovation_readiness_level_id,
      rid.innovation_acknowledgement,
      rid.innovation_pdf,
      rid.innovation_user_to_be_determined,
      rid.has_scaling_studies,
      previous_rid.innovation_readiness_level_id as previous_irl
    FROM \`result\` r
    left join \`version\` v on r.version_id = v.id
    right JOIN results_innovations_dev rid on rid.results_id = r.id and rid.is_active
    LEFT JOIN \`version\` previous_v on v.previous_phase = previous_v.id
    left join \`result\` previous_r on r.result_code = previous_r.result_code and previous_r.version_id = previous_v.id
    left join results_innovations_dev previous_rid on previous_rid.results_id = previous_r.id
    WHERE r.id = ? AND r.is_active;
    `;
    try {
      const resultTocResult: InnovationDevelopmentDto[] = await this.query(
        queryData,
        [resultId],
      );
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsDevRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getSectionSevenDataForReport(
    resultCodesArray: number[],
    phase?: number,
  ) {
    const resultCodes = (resultCodesArray ?? []).join(',');
    const queryData = `
    select
      -- result basic data
      r.id 'Result ID',
      r.result_code 'Result Code',
      -- Initiative Output - Innovation development specific fields
      rid.short_title 'Short title',
      concat(cic.name, ': ', cic.definition) as 'Innovation characterization',
      concat(cit.name, ': ', cit.definition) as 'Innovation nature',
      if(
        cit.code <> 12,
        'Not applicable',
        if(coalesce(rid.is_new_variety, 0) = 1, 'Yes', 'No')
      ) as 'New variety/breed?',
      if(
        cit.code <> 12,
        'Not applicable',
        rid.number_of_varieties
      ) 'Number of lines/varieties',
      rid.innovation_developers 'Innovation Developer(s)',
      rid.innovation_collaborators 'Innovation collaborator(s)',
      rid.innovation_acknowledgement 'Innovation acknowledgement',
      concat('Level ', cirl.id - 11, ': ', cirl.name) as 'Innovation readiness level',
      rid.evidences_justification 'Innovation readiness level justification',
      if(coalesce(rid.innovation_pdf, 0) = 1, 'Yes', 'No') as 'Published as IPSR PDF?',
      (
        SELECT
          GROUP_CONCAT(
            'Actor name: ',
            aty.name,
            ' - ',
            'Sex and age disaggregation: ',
            IF((ra.sex_and_age_disaggregation = 1), 'Yes', 'No'),
            ' - ',
            'Women Non-youth: ',
            IF((ra.has_women = 1), 'Yes', 'No'),
            ' - ',
            'Women youth: ',
            IF((ra.has_women_youth = 1), 'Yes', 'No'),
            ' - ',
            'Men Non-youth: ',
            IF((ra.has_men = 1), 'Yes', 'No'),
            ' - ',
            'Men youth: ',
            IF((ra.has_men_youth = 1), 'Yes', 'No') SEPARATOR ' - '
          ) AS Actors
        FROM
          result_actors ra
          LEFT JOIN actor_type aty ON aty.actor_type_id = ra.actor_type_id
        WHERE
          ra.result_id = r.id
          AND ra.is_active = 1
      ) AS 'Actors',
      (
        SELECT
          GROUP_CONCAT(
            'Organization name: ',
            cit2.name,
            IFNULL(
              CONCAT(' - ', 'Other type: ', rbit.other_institution),
              ''
            ) SEPARATOR ' - '
          ) AS organizations
        FROM
          results_by_institution_type rbit
          LEFT JOIN clarisa_institution_types cit2 ON cit2.code = rbit.institution_types_id
        WHERE
          rbit.results_id = r.id
          AND rbit.is_active = 1
          AND rbit.institution_roles_id = 5
      ) AS 'Organizations',
      (
        SELECT
          GROUP_CONCAT(
            'Measures: ',
            rim.unit_of_measure SEPARATOR ' - '
          ) AS 'Measures'
        FROM
          result_ip_measure rim
        WHERE
          rim.result_id = r.id
          AND rim.is_active = TRUE
      ) AS 'Measures',
      (
        SELECT
          GROUP_CONCAT(
            'Initiative: ',
            (
              SELECT
                CONCAT(ci.official_code, ' - ', ci.short_name)
              FROM
                clarisa_initiatives ci
              WHERE
                ci.id = rbi.inititiative_id
            ),
            ' - ',
            'Budget: ',
            IF(
              (rib.is_determined = 1),
              'Is not determined',
              rib.kind_cash
            ) SEPARATOR '\n'
          ) AS 'Initiative Budget'
        FROM
          result_initiative_budget rib
          LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        WHERE
          rib.result_initiative_id = rbi.id
          AND rib.is_active = TRUE
          AND rbi.is_active = TRUE
      ) AS 'Initiative Budget',
      (
        SELECT
          GROUP_CONCAT(
            'Center Grant Title: ',
            npp.grant_title,
            ' - ',
            'Budget: ',
            IF(
              (nppb.is_determined = 1),
              'Is not determined',
              nppb.kind_cash
            ) SEPARATOR '\n'
          ) AS 'NPP Budget'
        FROM
          non_pooled_projetct_budget nppb
          LEFT JOIN non_pooled_project npp ON npp.results_id = r.id
          LEFT JOIN clarisa_center cc ON cc.code = npp.lead_center_id
          LEFT JOIN clarisa_institutions ci2 ON ci2.id = cc.institutionId
          LEFT JOIN clarisa_institutions ci3 ON ci3.id = npp.funder_institution_id
        WHERE
          nppb.non_pooled_projetct_id = npp.id
          AND npp.is_active = TRUE
          AND nppb.is_active = TRUE
      ) AS 'NPP Budget',
      (
        SELECT
          GROUP_CONCAT(
            'Institution: ',
            ci3.name,
            ' - ',
            'Budget: ',
            IF(
              (rib2.is_determined = 1),
              'Is not determined',
              rib2.kind_cash
            ) SEPARATOR '\n'
          ) AS 'Partner Budget'
        FROM
          result_institutions_budget rib2
          LEFT JOIN results_by_institution rbi2 ON rbi2.result_id = r.id
          LEFT JOIN clarisa_institutions ci3 ON ci3.id = rbi2.institutions_id
        WHERE
          rib2.result_institution_id = rbi2.id
          AND rbi2.is_active = TRUE
          AND rib2.is_active = TRUE
      ) AS 'Partner Budget',
      (
        SELECT
          GROUP_CONCAT(
            (
              SELECT
                rq2.question_text
              FROM
                result_questions rq2
              WHERE
                rq2.result_question_id = rq.parent_question_id
            ),
            '  ',
            rq.question_text SEPARATOR '\n'
          ) AS 'Questions'
        FROM
          result_answers ra2
          LEFT JOIN result_questions rq ON rq.result_question_id = ra2.result_question_id
        WHERE
          ra2.result_id = r.id
          AND ra2.is_active = TRUE
          AND ra2.answer_boolean = TRUE
        ORDER BY
          rq.result_question_id ASC
      ) AS 'Questions',
      (
        SELECT
          GROUP_CONCAT('Link: ', e.link SEPARATOR '\n') AS 'Pictures Evidence'
        FROM
          evidence e
        WHERE
          e.result_id = r.id
          AND e.evidence_type_id = 3
          AND e.is_active = TRUE
      ) AS 'Pictures Evidence',
      (
        SELECT
          GROUP_CONCAT('Link: ', e.link SEPARATOR '\n') AS 'Materials Evidence'
        FROM
          evidence e
        WHERE
          e.result_id = r.id
          AND e.evidence_type_id = 4
          AND e.is_active = TRUE
      ) AS 'Materials Evidence'
    from
      results_innovations_dev rid
      left join result r on rid.results_id = r.id
      and r.is_active = 1
      left join clarisa_innovation_characteristic cic on rid.innovation_characterization_id = cic.id
      left join clarisa_innovation_type cit on rid.innovation_nature_id = cit.code
      left join clarisa_innovation_readiness_level cirl on rid.innovation_readiness_level_id = cirl.id
    where
      rid.is_active = 1
      and r.result_code ${resultCodes.length ? `in (${resultCodes})` : '= 0'}
      ${phase ? `and r.version_id = ${phase}` : ''}
    ;
    `;
    try {
      const resultTocResult = await this.query(queryData);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsDevRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
