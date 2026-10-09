import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ShareResultRequestService } from './share-result-request.service';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';
import { ApprovalChainDto } from './dto/approval-chain.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { KEYSET_PAGE_SIZE } from '../../../shared/utils/keyset-cursor.util';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Share Result Request')
@Controller()
@UseInterceptors(ResponseInterceptor)
export class ShareResultRequestController {
  constructor(
    private readonly shareResultRequestService: ShareResultRequestService,
  ) {}

  @Post('create/:resultId')
  @ApiOperation({
    summary: 'Create a new share result request',
    description:
      'Creates a new share result request for one or more initiatives. This endpoint allows sharing a result with other initiatives, optionally mapping it to Theory of Change (ToC). The request will be sent to the specified initiatives and notifications will be triggered.',
  })
  @ApiParam({
    name: 'resultId',
    type: 'number',
    description: 'ID of the result to be shared',
    example: 123,
  })
  @ApiBody({
    type: CreateTocShareResult,
    description:
      'Share result request details including initiative IDs, ToC mapping, and optional email template',
  })
  @ApiResponse({
    status: 201,
    description: 'Share result request successfully created',
    schema: {
      example: {
        response: [
          {
            share_result_request_id: 1,
            result_id: 123,
            owner_initiative_id: 10,
            shared_inititiative_id: 20,
            approving_inititiative_id: 20,
            request_status_id: 1,
            is_map_to_toc: true,
          },
        ],
        message: 'The initiative was correctly reported',
        status: 201,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  createRequest(
    @Body() createTocShareResult: CreateTocShareResult,
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    return this.shareResultRequestService.resultRequest(
      createTocShareResult,
      resultId,
      user,
    );
  }

  @Get('get/received')
  @ApiOperation({
    summary: 'Get all received share result requests',
    description:
      "Retrieves all share result requests that the current user has received. These are requests where the user's initiative is the recipient of a share request from another initiative. " +
      '@akili-spec notifications/inbox-paginated-load: supports phase scoping and keyset-paginated history (see the 3 query params below).',
  })
  @ApiQuery({
    name: 'version_id',
    required: false,
    type: Number,
    description:
      'Phase (version) id to scope results to. Omit for all phases (legacy behavior). Must be a positive integer; otherwise 400.',
    example: 12,
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['pending', 'history'],
    description:
      "Limit the response to only the pending set ('pending') or only a history page ('history'). Omit for the legacy shape: complete pending + first history page.",
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description:
      "Opaque keyset cursor from a previous response's `doneMeta.nextCursor` (history) or `pendingMeta.nextCursor` (paged pending), to fetch the next page. Malformed cursor -> 400.",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description:
      '@akili-spec notifications/admin-pending-paging: with scope=pending, switches to the paged pending mode (newest first by (requested_date, share_result_request_id)) and returns at most this many rows plus `pendingMeta { hasMore, nextCursor, total }`. Integer 1..200, else 400. Omit for the legacy complete pending set.',
  })
  @ApiQuery({
    name: 'seen',
    required: false,
    type: Boolean,
    description:
      "Paged pending mode only: 'true' / 'false' keeps only the caller's seen / unseen rows before paging. Anything else -> 400.",
  })
  @ApiResponse({
    status: 200,
    description:
      'List of all received share result requests for the current user',
    schema: {
      example: {
        response: [
          {
            share_result_request_id: 1,
            result_id: 123,
            result_code: 'R-2024-001',
            owner_initiative_id: 10,
            shared_inititiative_id: 20,
            approving_inititiative_id: 20,
            requester_initiative_id: 10,
            request_status_id: 1,
            requested_date: '2024-01-15T10:30:00Z',
            requested_by: 5,
            requested_first_name: 'John',
            requested_last_name: 'Doe',
            title: 'Result Title',
            description: 'Result Description',
            status_name: 'Active',
            result_type_name: 'Output',
            result_level_name: 'Initiative',
          },
        ],
        message: 'Successfully retrieved received requests',
        status: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  findReceived(
    @UserToken() user: TokenDto,
    @Query('version_id') versionId?: string,
    @Query('scope') scope?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('seen') seen?: string,
  ) {
    const parsedLimit = this.parseLimit(limit);
    const parsedSeen = this.parseSeen(seen);
    return this.shareResultRequestService.getReceivedResultRequest(user, {
      versionId,
      scope,
      cursor,
      // Spread keeps the legacy (no `limit`/`seen`) call shape identical to before (PPG-NFR-3).
      ...(parsedLimit !== undefined ? { limit: parsedLimit } : {}),
      ...(parsedSeen !== undefined ? { seen: parsedSeen } : {}),
    });
  }

  /** PPG-R-4: absent -> undefined (legacy); otherwise an integer in 1..200, else 400. */
  private parseLimit(limit?: string): number | undefined {
    if (limit === undefined || limit === null) {
      return undefined;
    }
    const parsed = limit.trim() === '' ? Number.NaN : Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > KEYSET_PAGE_SIZE) {
      throw new BadRequestException('Invalid limit');
    }
    return parsed;
  }

  /** PPG-R-6: absent -> undefined; 'true' / 'false' -> boolean; anything else -> 400. */
  private parseSeen(seen?: string): boolean | undefined {
    if (seen === undefined || seen === null) {
      return undefined;
    }
    if (seen === 'true') return true;
    if (seen === 'false') return false;
    throw new BadRequestException('Invalid seen');
  }

  // `BRS-T-2`: `seen-all` is declared before `seen/:shareResultRequestId`. The paths differ in
  // shape (`seen-all` vs `seen/<id>`), so neither can capture the other; the order is kept anyway.
  @Patch('seen-all')
  @ApiOperation({
    summary: 'Mark every pending received request as seen by the caller',
    description:
      'Records, for the calling user only, that all requests listed as pending in the bell (all phases) were seen. The set is resolved server-side; the client sends no ids. Idempotent. Never changes the requests themselves.',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of seen rows newly recorded (0 when already seen)',
    schema: {
      example: {
        response: { recorded: 12 },
        message: 'Requests marked as seen',
        status: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  markAllSeen(@UserToken() user: TokenDto) {
    return this.shareResultRequestService.markAllSeen(user);
  }

  @Patch('seen/:shareResultRequestId')
  @ApiOperation({
    summary: 'Mark one pending received request as seen by the caller',
    description:
      'Records, for the calling user only, that the request was seen. Idempotent. Never changes the request itself.',
  })
  @ApiParam({
    name: 'shareResultRequestId',
    type: 'number',
    description: 'ID of the share result request',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'The request is recorded as seen by the caller',
    schema: {
      example: {
        response: { seen: true },
        message: 'Request marked as seen',
        status: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - the id is not an integer',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - the request does not exist or is not pending',
  })
  markSeen(
    @UserToken() user: TokenDto,
    @Param('shareResultRequestId', ParseIntPipe) shareResultRequestId: number,
  ) {
    return this.shareResultRequestService.markSeen(user, shareResultRequestId);
  }

  @Get('get/sent')
  @ApiOperation({
    summary: 'Get all sent share result requests',
    description:
      "Retrieves all share result requests that the current user has sent. These are requests where the user's initiative is the requester sharing a result with other initiatives. " +
      '@akili-spec notifications/inbox-paginated-load: supports phase scoping and keyset-paginated history (see the 3 query params below).',
  })
  @ApiQuery({
    name: 'version_id',
    required: false,
    type: Number,
    description:
      'Phase (version) id to scope results to. Omit for all phases (legacy behavior). Must be a positive integer; otherwise 400.',
    example: 12,
  })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['pending', 'history'],
    description:
      "Limit the response to only the pending set ('pending') or only a history page ('history'). Omit for the legacy shape: complete pending + first history page.",
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description:
      "Opaque keyset cursor from a previous response's `doneMeta.nextCursor`, to fetch the next history page. Malformed cursor -> 400.",
  })
  @ApiResponse({
    status: 200,
    description: 'List of all sent share result requests by the current user',
    schema: {
      example: {
        response: [
          {
            share_result_request_id: 1,
            result_id: 123,
            result_code: 'R-2024-001',
            owner_initiative_id: 10,
            shared_inititiative_id: 20,
            approving_inititiative_id: 20,
            requester_initiative_id: 10,
            request_status_id: 1,
            requested_date: '2024-01-15T10:30:00Z',
            requested_by: 5,
            requested_first_name: 'John',
            requested_last_name: 'Doe',
            title: 'Result Title',
            description: 'Result Description',
            status_name: 'Pending',
            result_type_name: 'Output',
            result_level_name: 'Initiative',
          },
        ],
        message: 'Successfully retrieved sent requests',
        status: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  findSent(
    @UserToken() user: TokenDto,
    @Query('version_id') versionId?: string,
    @Query('scope') scope?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.shareResultRequestService.getSentResultRequest(user, {
      versionId,
      scope,
      cursor,
    });
  }

  @Get('get/result/:resultId/approval-chain')
  @ApiOperation({
    summary: "Get a result's approval chain",
    description:
      '@akili-spec notifications/detail-side-panel (DSP-R-12) — returns the submission step ' +
      'plus one step per program (primary first, then contributors by code) for one result: ' +
      'status, actor and date. Authorized when the user is an admin or holds an active role on ' +
      'an initiative involved in the result (owner, contributor, requester or approver of a ' +
      'request); otherwise 403 with no data. The response never carries an email or a user id.',
  })
  @ApiParam({
    name: 'resultId',
    type: 'number',
    description: 'ID of the result whose approval chain is requested',
    example: 9400,
  })
  @ApiResponse({
    status: 200,
    description: "The result's approval chain",
    type: ApprovalChainDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - resultId is not a positive integer',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - the user is not involved in this result and is not an admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - the result does not exist or is inactive',
  })
  getApprovalChain(
    @Param('resultId') resultId: string,
    @UserToken() user: TokenDto,
  ) {
    return this.shareResultRequestService.getApprovalChain(resultId, user);
  }

  @Get('get/all')
  @ApiOperation({
    summary: 'Get all share result requests for user',
    description:
      "Retrieves all share result requests (both sent and received) associated with the current user. This includes requests where the user's initiative is either the requester or the recipient.",
  })
  @ApiResponse({
    status: 200,
    description:
      'List of all share result requests (sent and received) for the current user',
    schema: {
      example: {
        response: [
          {
            share_result_request_id: 1,
            result_id: 123,
            result_code: 'R-2024-001',
            owner_initiative_id: 10,
            shared_inititiative_id: 20,
            approving_inititiative_id: 20,
            requester_initiative_id: 10,
            request_status_id: 1,
            requested_date: '2024-01-15T10:30:00Z',
            requested_by: 5,
            requested_first_name: 'John',
            requested_last_name: 'Doe',
            title: 'Result Title',
            description: 'Result Description',
            status_name: 'Active',
            result_type_name: 'Output',
            result_level_name: 'Initiative',
            is_requester: false,
          },
        ],
        message: 'Successfully retrieved all requests',
        status: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  findAll(@UserToken() user: TokenDto) {
    return this.shareResultRequestService.getResultRequestByUser(user);
  }

  @Patch('update')
  @ApiOperation({
    summary: 'Update a share result request',
    description:
      'Updates an existing share result request. This endpoint allows changing the request status (e.g., approve, reject) and updating the Theory of Change (ToC) mapping associated with the request. The user must have appropriate permissions to update the request.',
  })
  @ApiBody({
    type: CreateShareResultRequestDto,
    description:
      'Updated share result request data including status, result request details, and ToC mapping',
  })
  @ApiResponse({
    status: 200,
    description: 'Share result request successfully updated',
    schema: {
      example: {
        response: {
          share_result_request_id: 1,
          result_id: 123,
          request_status_id: 2,
          approved_by: 5,
          aprovaed_date: '2024-01-16T14:20:00Z',
        },
        message: 'Request successfully updated',
        status: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data, missing required fields, or invalid request status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - User does not have permission to update this request',
  })
  updateRequest(
    @UserToken() user: TokenDto,
    @Body() createShareResultsRequestDto: CreateShareResultRequestDto,
  ) {
    return this.shareResultRequestService.updateResultRequestByUser(
      createShareResultsRequestDto,
      user,
    );
  }

  @Version('2')
  @Patch('update')
  @ApiOperation({
    summary: 'Update a share result request (v2)',
    description:
      'Updates an existing share result request. This endpoint allows changing the request status (e.g., approve, reject) and updating the Theory of Change (ToC) mapping associated with the request. The user must have appropriate permissions to update the request. Version 2 includes enhanced ToC level mapping support.',
  })
  @ApiBody({
    type: CreateShareResultRequestDto,
    description:
      'Updated share result request data including status, result request details, and ToC mapping',
  })
  @ApiResponse({
    status: 200,
    description: 'Share result request successfully updated',
    schema: {
      example: {
        response: {
          share_result_request_id: 1,
          result_id: 123,
          request_status_id: 2,
          approved_by: 5,
          aprovaed_date: '2024-01-16T14:20:00Z',
        },
        message: 'Request successfully updated',
        status: 200,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data, missing required fields, or invalid request status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - User does not have permission to update this request',
  })
  updateRequestV2(
    @UserToken() user: TokenDto,
    @Body() createShareResultsRequestDto: CreateShareResultRequestDto,
  ) {
    return this.shareResultRequestService.updateResultRequestByUserV2(
      createShareResultsRequestDto,
      user,
    );
  }
}
