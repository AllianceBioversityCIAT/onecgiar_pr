import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  RequestTypeEnum,
  ShareResultRequest,
} from './entities/share-result-request.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RequestStatus } from './entities/request-status.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';
import {
  ApprovalChainDto,
  ApprovalChainStepDto,
} from './dto/approval-chain.dto';

/**
 * @akili-spec notifications/detail-side-panel
 * DSP-R-12, design.md §5/§8 — raw rows read by `getApprovalChainData` (≤ 4 queries), handed to the
 * pure `composeApprovalChain` below. Kept separate from `ApprovalChainDto` on purpose: these mirror
 * the SQL projection (ids, names, raw status codes), not the response shape.
 */
export interface ApprovalChainResultRow {
  id: number;
  is_active: boolean | number;
  status_id: number;
  result_status_name: string | null;
}

export interface ApprovalChainSubmissionRow {
  status: boolean | number;
  created_date: Date;
  actor_first_name: string | null;
  actor_last_name: string | null;
}

export interface ApprovalChainInitiativeRoleRow {
  initiative_id: number;
  official_code: string;
  short_name: string;
  name: string;
  initiative_role_id: number;
  created_by_first_name: string | null;
  created_by_last_name: string | null;
  created_date: Date;
}

export interface ApprovalChainRequestRow {
  shared_inititiative_id: number;
  owner_initiative_id: number | null;
  requester_initiative_id: number | null;
  approving_inititiative_id: number | null;
  official_code: string;
  short_name: string;
  name: string;
  request_type: 'contribution' | 'primary';
  request_status_id: number;
  requested_date: Date;
  aprovaed_date: Date | null;
  requested_by_first_name: string | null;
  requested_by_last_name: string | null;
  approved_by_first_name: string | null;
  approved_by_last_name: string | null;
}

function fullName(
  first: string | null | undefined,
  last: string | null | undefined,
): string | null {
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name.length ? name : null;
}

function mapRequestStatus(
  requestStatusId: number,
): 'accepted' | 'pending' | 'declined' | null {
  switch (Number(requestStatusId)) {
    case 1:
      return 'pending';
    case 2:
      return 'accepted';
    case 3:
      return 'declined';
    default:
      // 4 = draft — never surfaced in the chain (DD-4, falsifier "a status-4 draft appears").
      return null;
  }
}

/**
 * @akili-spec notifications/detail-side-panel
 * DSP-R-8, DSP-R-12, design.md §5 (DD-4) — pure composition: raw rows in, `ApprovalChainDto` out.
 * No I/O, no repository/service calls — every branch here is driven only by its arguments, so a
 * test can feed hand-built rows (owner, contribution requests at statuses 1/2/3/4, role-2 rows,
 * a submission row or none) straight in without mocking anything.
 *
 * Rules implemented (design.md §5):
 * 1. Submission: latest ACTIVE row already selected by the caller. `status=true` → `submitted`.
 *    Anything else (status=false, or no row at all) → `not_submitted`, using the result's current
 *    `status_id`/`result_status_name`, no actor/date.
 * 2. Primary: an active `primary` request (status ≠ 4) wins over the owner row — 1→pending,
 *    2→accepted, 3→declined; actor/date from requester (pending) or approver (decided). No primary
 *    request → the owner row is `accepted` (actor/date = created_by/created_date). Neither → no
 *    primary step.
 * 3. Contributors: union of role-2 rows and active `contribution` requests with status ∈ {1,2,3}
 *    (4 excluded), keyed by initiative, excluding the primary initiative. The latest request (by
 *    `requested_date`) decides status/actor/date — EXCEPT a role-2 row always wins over a request
 *    whose latest status is `declined` (the program is a contributor now); with no request at all,
 *    a role-2 row is `accepted` (created_by/created_date). Ordered by `official_code`.
 */
export function composeApprovalChain(
  resultId: number,
  resultRow: ApprovalChainResultRow,
  submissionRow: ApprovalChainSubmissionRow | null | undefined,
  initiativeRoleRows: ApprovalChainInitiativeRoleRow[],
  requestRows: ApprovalChainRequestRow[],
  viewerInitiativeIds: number[] = [],
): ApprovalChainDto {
  const isViewerProgram = (initiativeId: number): boolean =>
    viewerInitiativeIds.includes(initiativeId);

  const submission = (() => {
    const submitted = submissionRow && Boolean(submissionRow.status);
    return {
      state: submitted ? ('submitted' as const) : ('not_submitted' as const),
      result_status_id: resultRow?.status_id,
      result_status_name: resultRow?.result_status_name ?? null,
      actor_name: submitted
        ? fullName(
            submissionRow.actor_first_name,
            submissionRow.actor_last_name,
          )
        : null,
      date: submitted ? submissionRow.created_date : null,
    };
  })();

  const ownerRow = initiativeRoleRows.find(
    (row) => Number(row.initiative_role_id) === 1,
  );

  const activePrimaryRequest = requestRows
    .filter(
      (row) =>
        row.request_type === 'primary' && Number(row.request_status_id) !== 4,
    )
    .sort(
      (a, b) =>
        new Date(b.requested_date).getTime() -
        new Date(a.requested_date).getTime(),
    )[0];

  const steps: ApprovalChainStepDto[] = [];

  let primaryInitiativeId: number | null = null;

  if (activePrimaryRequest) {
    primaryInitiativeId = activePrimaryRequest.shared_inititiative_id;
    const status = mapRequestStatus(activePrimaryRequest.request_status_id);
    const decided = status !== 'pending';
    steps.push({
      initiative_id: activePrimaryRequest.shared_inititiative_id,
      official_code: activePrimaryRequest.official_code,
      short_name: activePrimaryRequest.short_name,
      name: activePrimaryRequest.name,
      role: 'primary',
      status,
      actor_name: decided
        ? fullName(
            activePrimaryRequest.approved_by_first_name,
            activePrimaryRequest.approved_by_last_name,
          )
        : fullName(
            activePrimaryRequest.requested_by_first_name,
            activePrimaryRequest.requested_by_last_name,
          ),
      date: decided
        ? activePrimaryRequest.aprovaed_date
        : activePrimaryRequest.requested_date,
      is_viewer_program: isViewerProgram(
        activePrimaryRequest.shared_inititiative_id,
      ),
    });
  } else if (ownerRow) {
    primaryInitiativeId = ownerRow.initiative_id;
    steps.push({
      initiative_id: ownerRow.initiative_id,
      official_code: ownerRow.official_code,
      short_name: ownerRow.short_name,
      name: ownerRow.name,
      role: 'primary',
      status: 'accepted',
      actor_name: fullName(
        ownerRow.created_by_first_name,
        ownerRow.created_by_last_name,
      ),
      date: ownerRow.created_date,
      is_viewer_program: isViewerProgram(ownerRow.initiative_id),
    });
  }

  const role2Rows = initiativeRoleRows.filter(
    (row) =>
      Number(row.initiative_role_id) === 2 &&
      row.initiative_id !== primaryInitiativeId,
  );
  const contributionRequests = requestRows.filter(
    (row) =>
      row.request_type === 'contribution' &&
      [1, 2, 3].includes(Number(row.request_status_id)) &&
      row.shared_inititiative_id !== primaryInitiativeId,
  );

  const contributorInitiativeIds = new Set<number>([
    ...role2Rows.map((row) => row.initiative_id),
    ...contributionRequests.map((row) => row.shared_inititiative_id),
  ]);

  const contributorSteps: ApprovalChainStepDto[] = [];

  for (const initiativeId of contributorInitiativeIds) {
    const role2Row = role2Rows.find(
      (row) => row.initiative_id === initiativeId,
    );
    const latestRequest = contributionRequests
      .filter((row) => row.shared_inititiative_id === initiativeId)
      .sort(
        (a, b) =>
          new Date(b.requested_date).getTime() -
          new Date(a.requested_date).getTime(),
      )[0];

    const requestStatus = latestRequest
      ? mapRequestStatus(latestRequest.request_status_id)
      : null;

    // A role-2 row always wins over a declined request, or when no request remains — the program
    // is an active contributor now (DD-4).
    const useRole2 =
      !!role2Row && (!latestRequest || requestStatus === 'declined');

    if (useRole2) {
      contributorSteps.push({
        initiative_id: role2Row.initiative_id,
        official_code: role2Row.official_code,
        short_name: role2Row.short_name,
        name: role2Row.name,
        role: 'contributor',
        status: 'accepted',
        actor_name: fullName(
          role2Row.created_by_first_name,
          role2Row.created_by_last_name,
        ),
        date: role2Row.created_date,
        is_viewer_program: isViewerProgram(role2Row.initiative_id),
      });
      continue;
    }

    if (latestRequest && requestStatus) {
      const decided = requestStatus !== 'pending';
      contributorSteps.push({
        initiative_id: latestRequest.shared_inititiative_id,
        official_code: latestRequest.official_code,
        short_name: latestRequest.short_name,
        name: latestRequest.name,
        role: 'contributor',
        status: requestStatus,
        actor_name: decided
          ? fullName(
              latestRequest.approved_by_first_name,
              latestRequest.approved_by_last_name,
            )
          : fullName(
              latestRequest.requested_by_first_name,
              latestRequest.requested_by_last_name,
            ),
        date: decided
          ? latestRequest.aprovaed_date
          : latestRequest.requested_date,
        is_viewer_program: isViewerProgram(
          latestRequest.shared_inititiative_id,
        ),
      });
    }
  }

  contributorSteps.sort((a, b) =>
    (a.official_code ?? '').localeCompare(b.official_code ?? ''),
  );

  steps.push(...contributorSteps);

  return {
    result_id: resultId,
    submission,
    steps,
  };
}

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
    private readonly dataSource: DataSource,
    private readonly _handlersError: HandlersError,
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
    try {
      // Check if there are active CONTRIBUTION drafts (request_status_id = 4) for this result.
      // `PNS-T-1` (design.md §5 item 6): status 4 is now ALSO used by a saved-but-not-sent
      // `primary` row (`PNS-DD-1`) — without this `request_type` filter, a result with only a
      // draft `primary` choice (no contribution draft at all) would be wrongly treated as having
      // draft contribution requests, searching for request_status_id 4 below for a share/contribute
      // check that should be comparing against PENDING (1) contribution rows instead.
      // @akili-spec notifications/primary-notify-on-submit
      const checkDraftQuery = `
        SELECT COUNT(*) as count
        FROM share_result_request srr
        WHERE srr.result_id = ?
          AND srr.request_status_id = 4
          AND srr.request_type = ?
          AND srr.is_active > 0;
      `;
      const draftResult = await this.query(checkDraftQuery, [
        resultId,
        RequestTypeEnum.CONTRIBUTION,
      ]);
      const hasDraftRequests = draftResult[0]?.count > 0;

      // Determine which request_status_id to search for
      const requestStatusId = hasDraftRequests ? 4 : 1;

      // `PSR-T-4` forward pointer (T-2/T-3 review): a `primary` row is inserted with
      // `owner_initiative_id = shared_inititiative_id = requested SP` (design.md §3.1). Without
      // this filter, a Center's contribution-request path could match that very row here — e.g.
      // an attempt to save the currently-requested SP as a contributor, BEFORE the
      // `initiativeId === shareInitId` self-share guard in `share-result-request.service.ts`
      // (`createShareResultRequests`) runs — and treat the pending primary request as an existing
      // contribution request to reuse/overwrite. Scoping to `contribution` rows closes that.
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
          AND srr.owner_initiative_id = ?
          AND srr.shared_inititiative_id = ?
          AND srr.request_status_id IN (?)
          AND srr.request_type = ?
          AND srr.is_active > 0;
      `;

      const shareResultRequest: ShareResultRequest[] = await this.query(
        queryData,
        [
          resultId,
          ownerInitId,
          shareInitId,
          requestStatusId,
          RequestTypeEnum.CONTRIBUTION,
        ],
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
		and not (srr.request_type = 'primary' and srr.request_status_id = 4)
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
	and not (srr.request_type = 'primary' and srr.request_status_id = 4)
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

  /**
   * `PSR-T-4` forward pointer (T-2/T-3 review) applies to this owner/shared lookup too
   * (`srr.owner_initiative_id = ? AND srr.shared_inititiative_id = ?`, same shape as
   * `shareResultRequestExists`). Left unfiltered on purpose: this method has zero callers in the
   * codebase today (confirmed by search) and its parameter binding is already broken independently
   * of `request_type` — the query has 3 `?` placeholders in the WHERE clause plus `is_active > 0`,
   * but the method only ever passes `[userId]`, so it would throw on the very first real call.
   * Fixing that mismatch is a separate, unrelated defect outside this task's scope; adding a
   * `request_type` filter to an unreachable, already-broken query would not close any real risk.
   */
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

  async updateFromTocByResultAndInitiative(
    resultId: number,
    sharedInitiativeId: number,
    fromToc: boolean,
    userId: number,
  ): Promise<void> {
    const queryData = `
      UPDATE share_result_request
      SET from_toc = ?,
          requested_by = ?,
          requested_date = NOW()
      WHERE result_id = ?
        AND shared_inititiative_id = ?
        AND is_active > 0
    `;
    try {
      await this.query(queryData, [
        fromToc ? 1 : 0,
        userId,
        resultId,
        sharedInitiativeId,
      ]);
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

  /**
   * @akili-spec notifications/detail-side-panel
   * DSP-R-12 — the result row the chain is about: `is_active` is read by the service to 404 a
   * missing/inactive result BEFORE composing anything (design.md §4.1 Errors).
   */
  async getResultForApprovalChain(
    resultId: number,
  ): Promise<ApprovalChainResultRow | undefined> {
    const queryData = `
      SELECT
        r.id,
        r.is_active,
        r.status_id,
        rs.status_name AS result_status_name
      FROM \`result\` r
      LEFT JOIN result_status rs ON rs.result_status_id = r.status_id
      WHERE r.id = ?;
    `;
    try {
      const rows: ApprovalChainResultRow[] = await this.query(queryData, [
        resultId,
      ]);
      return rows.length ? rows[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  /**
   * @akili-spec notifications/detail-side-panel
   * DSP-R-12, design.md §5/§8 — the 3 remaining reads behind the chain endpoint (with
   * `getResultForApprovalChain` above, 4 total, per the ≤ 4 query budget): the latest ACTIVE
   * submission, every active owner/contributor `results_by_inititiative` row, and every active
   * `share_result_request` row for the result. Raw rows only — composition is the pure
   * `composeApprovalChain` above, so the service/tests can exercise it without mocking this method.
   */
  async getApprovalChainData(resultId: number): Promise<{
    submissionRow: ApprovalChainSubmissionRow | undefined;
    initiativeRoleRows: ApprovalChainInitiativeRoleRow[];
    requestRows: ApprovalChainRequestRow[];
  }> {
    const submissionQuery = `
      SELECT
        s.status,
        s.created_date,
        u.first_name AS actor_first_name,
        u.last_name AS actor_last_name
      FROM submission s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.results_id = ?
        AND s.is_active > 0
      ORDER BY s.created_date DESC
      LIMIT 1;
    `;

    const initiativeRoleQuery = `
      SELECT
        rbi.inititiative_id AS initiative_id,
        ci.official_code,
        ci.short_name,
        ci.name,
        rbi.initiative_role_id,
        u.first_name AS created_by_first_name,
        u.last_name AS created_by_last_name,
        rbi.created_date
      FROM results_by_inititiative rbi
      INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
      LEFT JOIN users u ON u.id = rbi.created_by
      WHERE rbi.result_id = ?
        AND rbi.is_active > 0
        AND rbi.initiative_role_id IN (1, 2);
    `;

    const requestQuery = `
      SELECT
        srr.shared_inititiative_id,
        srr.owner_initiative_id,
        srr.requester_initiative_id,
        srr.approving_inititiative_id,
        ci.official_code,
        ci.short_name,
        ci.name,
        srr.request_type,
        srr.request_status_id,
        srr.requested_date,
        srr.aprovaed_date,
        ru.first_name AS requested_by_first_name,
        ru.last_name AS requested_by_last_name,
        au.first_name AS approved_by_first_name,
        au.last_name AS approved_by_last_name
      FROM share_result_request srr
      INNER JOIN clarisa_initiatives ci ON ci.id = srr.shared_inititiative_id
      LEFT JOIN users ru ON ru.id = srr.requested_by
      LEFT JOIN users au ON au.id = srr.approved_by
      WHERE srr.result_id = ?
        AND srr.is_active > 0;
    `;

    try {
      const [submissionRows, initiativeRoleRows, requestRows] =
        await Promise.all([
          this.query(submissionQuery, [resultId]),
          this.query(initiativeRoleQuery, [resultId]),
          this.query(requestQuery, [resultId]),
        ]);

      return {
        submissionRow: submissionRows?.length ? submissionRows[0] : undefined,
        initiativeRoleRows: initiativeRoleRows ?? [],
        requestRows: requestRows ?? [],
      };
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ShareResultRequestRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
