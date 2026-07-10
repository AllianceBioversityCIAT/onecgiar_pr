import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ShareResultRequestService } from './share-result-request.service';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';
import { GetResultRequestQueryDto } from './dto/get-result-request-query.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
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
      'Retrieves all share result requests that the current user has received. Supports optional filter by version, limit, and order (ASC/DESC) by requested_date.',
  })
  @ApiQuery({
    name: 'version_id',
    required: false,
    type: Number,
    description: 'Filter by version (phase) ID of the result',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max items per list (pending and done). Between 1 and 100.',
  })
  @ApiQuery({
    name: 'orderDirection',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort by requested_date',
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
    @Query() query: GetResultRequestQueryDto,
  ) {
    return this.shareResultRequestService.getReceivedResultRequest(user, query);
  }

  @Get('get/sent')
  @ApiOperation({
    summary: 'Get all sent share result requests',
    description:
      'Retrieves all share result requests that the current user has sent. Supports optional filter by version, limit, and order (ASC/DESC) by requested_date.',
  })
  @ApiQuery({
    name: 'version_id',
    required: false,
    type: Number,
    description: 'Filter by version (phase) ID of the result',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max items per list (pending and done). Between 1 and 100.',
  })
  @ApiQuery({
    name: 'orderDirection',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort by requested_date',
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
    @Query() query: GetResultRequestQueryDto,
  ) {
    return this.shareResultRequestService.getSentResultRequest(user, query);
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
