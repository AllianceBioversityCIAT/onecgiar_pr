import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ShareResultRequest } from './entities/share-result-request.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RequestStatus } from './entities/request-status.entity';

@Injectable()
export class ShareResultRequestRepository extends Repository<ShareResultRequest> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
  ) {
    super(ShareResultRequest, dataSource.createEntityManager());
  }

  async shareResultRequestExists(resultId: number, ownerInitId: number, shareInitId: number) {
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
      const shareResultRequest: ShareResultRequest[] = await this.query(queryData, [resultId, ownerInitId, shareInitId]);
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

  async getRequestByUser(userId: number) {
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
		srr.requester_initiative_id,
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
		false as is_requester
    FROM
    	share_result_request srr
    	inner join \`result\` r on r.id = srr.result_id 
    						and r.is_active > 0
    	inner join result_level rl on rl.id = r.result_level_id 
    	inner join result_type rt on rt.id = r.result_type_id 
		left join users u on u.id = srr.requested_by 
    	left join users u2 on u2.id = srr.approved_by 
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
		and srr.is_active > 0
	order by srr.request_status_id ASC;
    `;
    try {
      const shareResultRequest: ShareResultRequest[] = await this.query(queryData, [userId]);
      return shareResultRequest;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getPendingByUser(userId: number) {
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
		srr.requester_initiative_id,
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
		true as is_requester
    FROM
    	share_result_request srr
    	inner join \`result\` r on r.id = srr.result_id 
    						and r.is_active > 0
    	inner join result_level rl on rl.id = r.result_level_id 
    	inner join result_type rt on rt.id = r.result_type_id 
		left join users u on u.id = srr.requested_by 
    	left join users u2 on u2.id = srr.approved_by  
    WHERE 
    	srr.requester_initiative_id in (
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
      const shareResultRequest: ShareResultRequest[] = await this.query(queryData, [userId]);
      return shareResultRequest;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getInitiativeOnlyPendingByResult(userId: number) {
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
      const shareResultRequest: ShareResultRequest[] = await this.query(queryData, [userId]);
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
      const shareResultRequest: ShareResultRequest[] = await this.query(queryData, [userId]);
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

