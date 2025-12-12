import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import {
  SessionResponseDto,
  ProposalResponseDto,
  EventResponseDto,
  ResultStateResponseDto,
  UsageStatsResponseDto,
  ResultContextFieldDto,
  DacScoreResponseDto,
} from './dto/responses';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateProposalsDto } from './dto/create-proposals.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveChangesDto } from './dto/save-changes.dto';
import { UpdateDacScoreDto } from './dto/update-dac-score.dto';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@ApiTags('AI Review')
@Controller()
@UseInterceptors(ResponseInterceptor)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('result-context/:resultId')
  @ApiOperation({
    summary: 'Get result context for AI processing',
    description:
      'Retrieves the current text content of result fields that can be improved by AI. Returns title and description for all results, plus short_title for Innovation Development results.',
  })
  @ApiOkResponse({
    description: 'Result context retrieved successfully',
    type: [ResultContextFieldDto],
    example: [
      {
        field_name: 'title',
        original_text: 'Original title text',
      },
      {
        field_name: 'description',
        original_text: 'Original description text',
      },
      {
        field_name: 'short_title',
        original_text: 'Original short title text',
      },
    ],
  })
  @ApiResponse({
    status: 404,
    description: 'Result not found',
  })
  @ApiParam({
    name: 'resultId',
    description: 'ID of the result to get context for',
    type: Number,
    example: 123,
  })
  async getResultContext(@Param('resultId', ParseIntPipe) resultId: number) {
    return await this.aiService.getResultContext(resultId);
  }

  @Get('result-context/dac-scores/:resultId')
  @ApiOperation({
    summary: 'Get DAC tag selections for a result',
    description:
      'Returns the stored tag id and impact area id for each DAC field (gender, climate, environmental, poverty, nutrition).',
  })
  @ApiOkResponse({
    description: 'DAC scores retrieved successfully',
    type: [DacScoreResponseDto],
  })
  async getDacScores(@Param('resultId', ParseIntPipe) resultId: number) {
    return await this.aiService.getDacScores(resultId);
  }

  @Patch('dac-scores/:resultId')
  @ApiOperation({
    summary: 'Update a DAC score selection',
    description:
      'Allows the AI workflow to persist manual adjustments for a DAC dimension while logging the change in AI tracking tables.',
  })
  @ApiOkResponse({
    description: 'DAC score updated successfully',
    type: DacScoreResponseDto,
  })
  @ApiBody({
    type: UpdateDacScoreDto,
    examples: {
      example: {
        summary: 'Update gender DAC',
        value: {
          field_name: 'gender',
          tag_id: 2,
          impact_area_id: null,
          change_reason: 'Updated after AI review section',
        },
      },
    },
  })
  async updateDacScore(
    @Param('resultId', ParseIntPipe) resultId: number,
    @Body() updateDacScoreDto: UpdateDacScoreDto,
    @UserToken() user: TokenDto,
  ) {
    return await this.aiService.updateDacScore(
      resultId,
      updateDacScoreDto,
      user,
    );
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create AI review session',
    description:
      'Creates a new AI review session and logs the opening event. This is called when a user opens the AI review modal.',
  })
  @ApiCreatedResponse({
    description: 'Session created successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input data',
  })
  @ApiBody({
    type: CreateSessionDto,
    description: 'Session creation data',
    examples: {
      example: {
        summary: 'Create session example',
        value: {
          result_id: 123,
        },
      },
    },
  })
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @UserToken() user: TokenDto,
  ) {
    return await this.aiService.createSession(createSessionDto, user);
  }

  @Post('sessions/:sessionId/close')
  @ApiOperation({
    summary: 'Close AI review session',
    description:
      'Closes an existing AI review session and logs the closing event. This is called when a user closes the AI review modal.',
  })
  @ApiOkResponse({
    description: 'Session closed successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'ID of the session to close',
    type: Number,
    example: 1,
  })
  async closeSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @UserToken() user: TokenDto,
  ) {
    return await this.aiService.closeSession(sessionId, user);
  }

  @Post('sessions/:sessionId/proposals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Save AI-generated proposals',
    description:
      'Saves the proposals generated by the external AI service for a specific session. These proposals will be displayed to the user in the modal.',
  })
  @ApiCreatedResponse({
    description: 'Proposals saved successfully',
    type: [ProposalResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'ID of the session to save proposals for',
    type: Number,
    example: 1,
  })
  @ApiBody({
    type: CreateProposalsDto,
    description: 'Proposals data from AI service',
    examples: {
      example: {
        summary: 'Save proposals example',
        value: {
          proposals: [
            {
              field_name: 'title',
              original_text: 'Original title text',
              proposed_text: 'Improved title text',
              needs_improvement: true,
            },
            {
              field_name: 'description',
              original_text: 'Original description',
              proposed_text: 'Enhanced description',
              needs_improvement: false,
            },
            {
              field_name: 'gender',
              original_text: '{"tag_id":1,"impact_area_id":null}',
              proposed_text: '{"tag_id":3,"impact_area_id":45}',
              needs_improvement: false,
            },
          ],
        },
      },
    },
  })
  async createProposals(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() createProposalsDto: CreateProposalsDto,
  ) {
    return await this.aiService.createProposals(sessionId, createProposalsDto);
  }

  @Get('sessions/:sessionId/proposals')
  @ApiOperation({
    summary: 'Get AI proposals for session',
    description:
      'Retrieves all AI-generated proposals for a specific session to display them in the frontend modal.',
  })
  @ApiOkResponse({
    description: 'Proposals retrieved successfully',
    type: [ProposalResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'ID of the session to get proposals for',
    type: Number,
    example: 1,
  })
  async getProposals(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return await this.aiService.getProposals(sessionId);
  }

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Track AI review event',
    description:
      'Logs user interactions with the AI review interface (apply proposal, regenerate, save changes, etc.). Used for analytics and audit trails.',
  })
  @ApiCreatedResponse({
    description: 'Event logged successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid event data',
  })
  @ApiBody({
    type: CreateEventDto,
    description: 'Event tracking data',
    examples: {
      example: {
        summary: 'Track apply proposal event',
        value: {
          session_id: 1,
          result_id: 123,
          user_id: 456,
          event_type: 'APPLY_PROPOSAL',
          field_name: 'title',
        },
      },
      regenerate_example: {
        summary: 'Track regenerate event',
        value: {
          session_id: 1,
          result_id: 123,
          user_id: 456,
          event_type: 'REGENERATE',
          field_name: 'description',
        },
      },
    },
  })
  async createEvent(
    @Body() createEventDto: CreateEventDto,
    @UserToken() user: TokenDto,
  ) {
    return await this.aiService.createEvent(createEventDto, user);
  }

  @Post('sessions/:sessionId/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save final changes to result',
    description:
      'Saves the final text chosen by the user to the actual result record. Creates audit trail entries and updates AI state tracking.',
  })
  @ApiOkResponse({
    description: 'Changes saved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'ID of the session to save changes for',
    type: Number,
    example: 1,
  })
  @ApiBody({
    type: SaveChangesDto,
    description: 'Final changes to save',
    examples: {
      example: {
        summary: 'Save changes example',
        value: {
          fields: [
            {
              field_name: 'title',
              new_value: 'Improved title text',
              change_reason: 'Applied AI suggestion',
              was_ai_suggested: true,
              user_feedback: 'Good suggestion',
            },
            {
              field_name: 'description',
              new_value: 'Enhanced description text',
              change_reason: 'Manual edit after AI review',
              was_ai_suggested: false,
            },
          ],
        },
      },
    },
  })
  async saveChanges(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() saveChangesDto: SaveChangesDto,
    @UserToken() user: TokenDto,
  ) {
    return await this.aiService.saveChanges(sessionId, saveChangesDto, user);
  }

  @Get('results/:resultId/state')
  @ApiOperation({
    summary: 'Get AI suggestion state for result',
    description:
      'Returns the current AI suggestion status for each field of a result. Used to display "AI suggested" tags in the UI.',
  })
  @ApiOkResponse({
    description: 'State retrieved successfully',
    type: ResultStateResponseDto,
  })
  @ApiParam({
    name: 'resultId',
    description: 'ID of the result to get state for',
    type: Number,
    example: 123,
  })
  async getResultState(@Param('resultId', ParseIntPipe) resultId: number) {
    return await this.aiService.getResultState(resultId);
  }

  @Get('results/:resultId/stats')
  @ApiOperation({
    summary: 'Get AI review usage statistics',
    description:
      'Returns usage statistics and metrics for AI review features on a specific result (total sessions, events by type, etc.).',
  })
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
    type: UsageStatsResponseDto,
  })
  @ApiParam({
    name: 'resultId',
    description: 'ID of the result to get statistics for',
    type: Number,
    example: 123,
  })
  async getResultStats(@Param('resultId', ParseIntPipe) resultId: number) {
    return await this.aiService.getResultStats(resultId);
  }
}
