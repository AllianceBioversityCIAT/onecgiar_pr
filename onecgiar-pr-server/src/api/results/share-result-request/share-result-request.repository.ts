import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ShareResultRequest } from './entities/share-result-request.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RequestStatus } from './entities/request-status.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ShareResultRequestRepository
  extends BaseRepository<ShareResultRequest>
  implements LogicalDelete<ShareResultRequest>
{
  createQueries(
    config: ReplicableConfigInterface<ShareResultRequest>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
        SELECT ${config.new_result_id} as result_id,  
			rbi2.inititiative_id as owner_initiative_id, 
			rbi.inititiative_id as  shared_inititiative_id,
			rbi.inititiative_id as  approving_inititiative_id,
			rbi2.inititiative_id as requester_initiative_id,
			1 as request_status_id,
			${config.user.id} as requested_by
			from \`result\` r 
			inner join results_by_inititiative rbi on rbi.result_id = r.id 
													and rbi.is_active > 0
													and rbi.initiative_role_id = 2
			inner join results_by_inititiative rbi2 on rbi2.result_id = r.id 
													and rbi2.is_active > 0
													and rbi2.initiative_role_id = 1
			where r.is_active > 0
				and r.id  = ${config.old_result_id};
        `,
      insertQuery: `
        insert into share_result_request 
			(result_id,
			owner_initiative_id,
			shared_inititiative_id,
			approving_inititiative_id,
			requester_initiative_id,
			request_status_id,
			requested_by
			)
			SELECT ${config.new_result_id} as result_id,  
			rbi2.inititiative_id as owner_initiative_id, 
			rbi.inititiative_id as  shared_inititiative_id,
			rbi.inititiative_id as  approving_inititiative_id,
			rbi2.inititiative_id as requester_initiative_id,
			1 as request_status_id,
			${config.user.id} as requested_by
			from \`result\` r 
			inner join results_by_inititiative rbi on rbi.result_id = r.id 
													and rbi.is_active > 0
													and rbi.initiative_role_id = 2
			inner join results_by_inititiative rbi2 on rbi2.result_id = r.id 
													and rbi2.is_active > 0
													and rbi2.initiative_role_id = 1
			where r.is_active > 0
				and r.id  = ${config.old_result_id};`,
      returnQuery: `select * from share_result_request srr WHERE srr.is_active > 0 and srr.result_id = ${config.new_result_id};`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ShareResultRequestRepository.name,
  );
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ShareResultRequest, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete srr from share_result_request srr 
		where srr.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ShareResultRequestRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ShareResultRequest> {
    const queryData = `update share_result_request srr 
		set srr.is_active = 0
		where srr.is_active > 0
			and srr.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ShareResultRequestRepository.name,
          debug: true,
        }),
      );
  }

  async shareResultRequestExists(
    resultId: number,
    ownerInitId: number,
    shareInitId: number,
  ) {
    const queryData = `
    SELECT
    	srr.share_result_request_id,
    	srr.is_active,
    	srr.requested_date,
    	srr.aprovaed_date,
    	srr.result_id,
    	srr.owner_initiative_id,
    	srr.shared_inititiative_id,
    	srr.approving_inititiative_id,
    	srr.toc_result_id,
    	srr.action_area_outcome_id,
    	srr.request_status_id,
    	srr.requested_by,
    	srr.approved_by
    FROM
    	share_result_request srr
    WHERE
    	srr.result_id = ?
    	and srr.owner_initiative_id = ?
    	and srr.shared_inititiative_id = ?
      and srr.request_status_id in (1)
	  and srr.is_active > 0;
    `;
    try {
      const shareResultRequest: ShareResultRequest[] = await this.query(
        queryData,
        [resultId, ownerInitId, shareInitId],
      );
      return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllRequestStatus() {
    const queryData = `
    SELECT
    	rs.request_status_id,
    	rs.name,
    	rs.description
    FROM
    	request_status rs;
    `;
    try {
      const shareResultRequest: RequestStatus[] = await this.query(queryData);
      return shareResultRequest;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getRequestByUser(userId: number, roleId: number) {
    const queryData = `
    SELECT
    	srr.share_result_request_id,
    	srr.is_active,
    	srr.requested_date,
    	srr.aprovaed_date,
    	srr.result_id,
		r.result_code,
    	srr.owner_initiative_id,
    	srr.shared_inititiative_id,
    	srr.approving_inititiative_id,
    	ci.official_code as approving_official_code,
		ci.short_name as approving_short_name,
		srr.requester_initiative_id,
		ci2.official_code as requester_official_code,
		ci2.short_name as requester_short_name,
    	srr.toc_result_id,
    	srr.action_area_outcome_id,
    	srr.request_status_id,
    	srr.requested_by,
		u.first_name as requested_first_name,
    	u.last_name as requested_last_name,
    	srr.approved_by,
    	u2.first_name as approved_first_name,
    	u2.last_name as approved_last_name,
		srr.planned_result,
    	r.description,
    	r.title,
		r.status,
		r.status_id,
		rs.status_name,
		r.result_level_id,
		r.result_type_id,
    	rt.name as result_type_name,
    	rl.name as result_level_name,
		false as is_requester,
		v.status as version_status,
		v.id as version_id,
		v.phase_year
    FROM
    	share_result_request srr
    	inner join \`result\` r on r.id = srr.result_id 
    						and r.is_active > 0
    	inner join result_level rl on rl.id = r.result_level_id 
    	inner join result_type rt on rt.id = r.result_type_id 
		left join users u on u.id = srr.requested_by 
    	left join users u2 on u2.id = srr.approved_by 
		left join clarisa_initiatives ci on ci.id = srr.approving_inititiative_id 
    	left join clarisa_initiatives ci2 on ci2.id = srr.requester_initiative_id 
		INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
		inner join \`version\` v on v.id = r.version_id
    WHERE 
		srr.is_active > 0
		${
      roleId == 1
        ? ''
        : `and srr.approving_inititiative_id in (
			SELECT
				rbu.initiative_id
			from
				role_by_user rbu
			WHERE
				rbu.\`user\` = ?
				and rbu.initiative_id is not null
				and rbu.action_area_id is null
			)`
    }
	order by srr.request_status_id ASC;
    `;
    try {
      const shareResultRequest: ShareResultRequest[] = await this.query(
        queryData,
        [userId],
      );
      return shareResultRequest;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getPendingByUser(userId: number, roleId: number) {
    const queryData = `
    SELECT
    	srr.share_result_request_id,
    	srr.is_active,
    	srr.requested_date,
    	srr.aprovaed_date,
    	srr.result_id,
		r.result_code,
    	srr.owner_initiative_id,
    	srr.shared_inititiative_id,
    	srr.approving_inititiative_id,
    	ci.official_code as approving_official_code,
		srr.requester_initiative_id,
		ci2.official_code as requester_official_code,
    	srr.toc_result_id,
    	srr.action_area_outcome_id,
    	srr.request_status_id,
    	srr.requested_by,
		u.first_name as requested_first_name,
    	u.last_name as requested_last_name,
    	srr.approved_by,
    	u2.first_name as approved_first_name,
    	u2.last_name as approved_last_name,
		srr.planned_result,
    	r.description,
    	r.title,
		r.result_level_id,
		r.result_type_id,
    	rt.name as result_type_name,
    	rl.name as result_level_name,
		true as is_requester,
		v.status as version_status,
		v.id as version_id
    FROM
    	share_result_request srr
    	inner join \`result\` r on r.id = srr.result_id 
    						and r.is_active > 0
    	inner join result_level rl on rl.id = r.result_level_id 
    	inner join result_type rt on rt.id = r.result_type_id 
		left join users u on u.id = srr.requested_by 
    	left join users u2 on u2.id = srr.approved_by  
		left join clarisa_initiatives ci on ci.id = srr.approving_inititiative_id 
    	left join clarisa_initiatives ci2 on ci2.id = srr.requester_initiative_id 
		inner join \`version\` v on v.id = r.version_id 
    WHERE 
	srr.is_active > 0
	${
    roleId == 1
      ? ''
      : `and srr.requester_initiative_id in (
				SELECT
					rbu.initiative_id
				from
					role_by_user rbu
				WHERE
					rbu.\`user\` = ?
					and rbu.initiative_id is not null
					and rbu.action_area_id is null
				)`
  }
		order by srr.request_status_id ASC;
    `;
    try {
      const shareResultRequest: ShareResultRequest[] = await this.query(
        queryData,
        [userId],
      );
      return shareResultRequest;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getInitiativeOnlyPendingByResult(userId: number, version = 1) {
    const queryData = `
    SELECT
    	srr.share_result_request_id,
    	srr.is_active,
    	srr.requested_date,
    	srr.aprovaed_date,
    	srr.result_id,
    	srr.owner_initiative_id,
    	srr.shared_inititiative_id,
    	srr.approving_inititiative_id,
    	srr.toc_result_id,
    	srr.action_area_outcome_id,
    	srr.request_status_id,
    	srr.requested_by,
    	srr.approved_by,
    	r.description,
    	r.title,
    	rt.name as result_type_name,
    	rl.name as result_level_name
    FROM
    	share_result_request srr
    	inner join \`result\` r on r.id = srr.result_id 
    						and r.is_active > 0
    	inner join result_level rl on rl.id = r.result_level_id 
    	inner join result_type rt on rt.id = r.result_type_id 
    WHERE 
    	srr.approving_inititiative_id in (
    	SELECT
    		rbu.initiative_id
    	from
    		role_by_user rbu
    	WHERE
    		rbu.\`user\` = ?
    		and rbu.initiative_id is not null
    		and rbu.action_area_id is null
    	)
		and srr.is_active > 0;
    `;
    try {
      const shareResultRequest: ShareResultRequest[] = await this.query(
        queryData,
        [userId, version],
      );
      return shareResultRequest;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getRequestByUserId(userId: number) {
    const queryData = `
    SELECT
    	srr.share_result_request_id,
    	srr.is_active,
    	srr.requested_date,
    	srr.aprovaed_date,
    	srr.result_id,
    	srr.owner_initiative_id,
    	srr.shared_inititiative_id,
    	srr.approving_inititiative_id,
    	srr.toc_result_id,
    	srr.action_area_outcome_id,
    	srr.request_status_id,
    	srr.requested_by,
    	srr.approved_by
    FROM
    	share_result_request srr
    WHERE
    	srr.result_id = ?
    	and srr.owner_initiative_id = ?
    	and srr.shared_inititiative_id = ?
		and srr.is_active > 0;
    `;
    try {
      const shareResultRequest: ShareResultRequest[] = await this.query(
        queryData,
        [userId],
      );
      return shareResultRequest.length ? shareResultRequest[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async cancelRequest(requestIds: number[]) {
    const queryData = `
    update share_result_request 
	set is_active = FALSE 
	where is_active > 0
		and share_result_request_id in (${requestIds.toString()})
    `;
    try {
      const shareResultRequest = await this.query(queryData);
      return shareResultRequest;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
