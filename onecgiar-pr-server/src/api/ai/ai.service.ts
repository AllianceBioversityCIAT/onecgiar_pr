import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';
import {
  AiReviewEvent,
  AiReviewEventType,
  AiReviewEventFieldName,
} from './entities/ai-review-event.entity';
import {
  AiReviewSession,
  AiReviewSessionStatus,
} from './entities/ai-review-session.entity';
import {
  ResultFieldAiState,
  ResultFieldAiStateStatus,
} from './entities/result-field-ai-state.entity';
import {
  AiReviewProposal,
  AiReviewProposalFieldName,
} from './entities/ai-review-proposal.entity';
import {
  ResultFieldRevision,
  ResultFieldRevisionFieldName,
  ResultFieldRevisionProvenance,
} from './entities/result-field-revision.entity';
import { ResultFieldAiStateFieldName } from './entities/result-field-ai-state.entity';
import {
  SessionResponseDto,
  ProposalResponseDto,
  EventResponseDto,
  ResultContextFieldDto,
} from './dto/responses';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateProposalsDto } from './dto/create-proposals.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveChangesDto } from './dto/save-changes.dto';
import { Result } from '../results/entities/result.entity';
import { ResultsInnovationsDev } from '../results/summary/entities/results-innovations-dev.entity';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ReturnResponseUtil } from '../../shared/utils/response.util';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AiReviewSession)
    private sessionRepository: Repository<AiReviewSession>,
    @InjectRepository(AiReviewProposal)
    private proposalRepository: Repository<AiReviewProposal>,
    @InjectRepository(AiReviewEvent)
    private eventRepository: Repository<AiReviewEvent>,
    @InjectRepository(ResultFieldRevision)
    private revisionRepository: Repository<ResultFieldRevision>,
    @InjectRepository(ResultFieldAiState)
    private aiStateRepository: Repository<ResultFieldAiState>,
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    @InjectRepository(ResultsInnovationsDev)
    private innovationsDevRepository: Repository<ResultsInnovationsDev>,
    private readonly _handlersError: HandlersError,
  ) {}

  async getResultContext(resultId: number) {
    try {
      const result = await this.resultRepository.findOne({
        select: ['title', 'description'],
        where: { id: resultId },
      });

      if (!result) {
        throw {
          response: {},
          message: 'Result not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const contextFields: ResultContextFieldDto[] = [
        {
          field_name: 'title',
          original_text: result.title,
        },
        {
          field_name: 'description',
          original_text: result.description || null,
        },
      ];

      const innovationDev = await this.innovationsDevRepository
        .createQueryBuilder('rid')
        .select('rid.short_title')
        .where('rid.results_id = :resultId', { resultId })
        .getOne();

      if (innovationDev?.short_title) {
        contextFields.push({
          field_name: 'short_title',
          original_text: innovationDev.short_title,
        });
      }

      return ReturnResponseUtil.format({
        response: contextFields,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async createSession(createSessionDto: CreateSessionDto, user: TokenDto) {
    try {
      const session = this.sessionRepository.create({
        result_id: createSessionDto.result_id,
        opened_by: user.id,
        all_sections_completed: false,
        status: AiReviewSessionStatus.COMPLETED,
      });
      const savedSession = await this.sessionRepository.save(session);

      await this.eventRepository.save({
        session_id: savedSession.id,
        result_id: createSessionDto.result_id,
        user_id: user.id,
        event_type: AiReviewEventType.CLICK_REVIEW,
      });

      return ReturnResponseUtil.format({
        response: this.mapSessionToResponse(savedSession, user),
        message: 'Session created successfully',
        statusCode: HttpStatus.CREATED,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async closeSession(sessionId: number, user: TokenDto) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });
      if (!session) {
        throw {
          response: {},
          message: 'Session not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      session.closed_at = new Date();
      const updatedSession = await this.sessionRepository.save(session);

      await this.eventRepository.save({
        session_id: sessionId,
        result_id: session.result_id,
        user_id: user.id,
        event_type: AiReviewEventType.CLOSE_MODAL,
      });

      return ReturnResponseUtil.format({
        response: this.mapSessionToResponse(updatedSession, user),
        message: 'Session closed successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async createProposals(
    sessionId: number,
    createProposalsDto: CreateProposalsDto,
  ) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });
      if (!session) {
        throw {
          response: {},
          message: 'Session not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const proposals = createProposalsDto.proposals.map((proposal) =>
        this.proposalRepository.create({
          session_id: sessionId,
          field_name: proposal.field_name,
          original_text: proposal.original_text,
          proposed_text: proposal.proposed_text,
          needs_improvement: proposal.needs_improvement,
        }),
      );

      const savedProposals = await this.proposalRepository.save(proposals);
      return ReturnResponseUtil.format({
        response: savedProposals.map((p) => this.mapProposalToResponse(p)),
        message: 'Proposals created successfully',
        statusCode: HttpStatus.CREATED,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getProposals(sessionId: number) {
    try {
      const proposals = await this.proposalRepository.find({
        where: { session_id: sessionId },
        order: { created_at: 'ASC' },
      });

      return ReturnResponseUtil.format({
        response: proposals.map((p) => this.mapProposalToResponse(p)),
        message: 'Proposals retrieved successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async createEvent(createEventDto: CreateEventDto, user: TokenDto) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: createEventDto.session_id },
      });
      if (!session) {
        throw {
          response: {},
          message: 'Session not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (createEventDto.field_name) {
        if (createEventDto.field_name === AiReviewEventFieldName.SHORT_TITLE) {
          const hasInnovationDev = await this.innovationsDevRepository.exists({
            where: { results_id: session.result_id },
          });
          if (!hasInnovationDev) {
            throw {
              response: {},
              message:
                'short_title field is only applicable for Innovation Development results',
              status: HttpStatus.BAD_REQUEST,
            };
          }
        }
      }

      const event = this.eventRepository.create({
        ...createEventDto,
        user_id: user.id,
      });
      const savedEvent = await this.eventRepository.save(event);
      return ReturnResponseUtil.format({
        response: this.mapEventToResponse(savedEvent, user),
        message: 'Event created successfully',
        statusCode: HttpStatus.CREATED,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveChanges(
    sessionId: number,
    saveChangesDto: SaveChangesDto,
    user: TokenDto,
  ) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });
      if (!session) {
        throw {
          response: {},
          message: 'Session not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      for (const field of saveChangesDto.fields) {
        if (field.field_name === AiReviewProposalFieldName.SHORT_TITLE) {
          const hasInnovationDev = await this.innovationsDevRepository.exists({
            where: { results_id: session.result_id },
          });
          if (!hasInnovationDev) {
            throw {
              response: {},
              message:
                'short_title field is only applicable for Innovation Development results',
              status: HttpStatus.BAD_REQUEST,
            };
          }
        }

        let previousText: string | null = null;

        switch (field.field_name) {
          case AiReviewProposalFieldName.TITLE:
          case AiReviewProposalFieldName.DESCRIPTION: {
            const current = await this.resultRepository.findOne({
              where: { id: session.result_id },
            });
            previousText = current?.[field.field_name] ?? null;
            break;
          }
          case AiReviewProposalFieldName.SHORT_TITLE: {
            const current = await this.innovationsDevRepository.findOne({
              where: { results_id: session.result_id },
            });
            previousText = current?.short_title ?? null;
            break;
          }
        }

        const provenance = field.was_ai_suggested
          ? ResultFieldRevisionProvenance.AI_SUGGESTED
          : ResultFieldRevisionProvenance.USER_EDIT;

        await this.revisionRepository.save({
          result_id: session.result_id,
          user_id: user.id,
          field_name:
            field.field_name as unknown as ResultFieldRevisionFieldName,
          old_value: previousText,
          new_value: field.new_value,
          change_reason: field.change_reason,
          provenance,
          proposal_id: field.proposal_id ?? null,
        });

        switch (field.field_name) {
          case AiReviewProposalFieldName.TITLE:
          case AiReviewProposalFieldName.DESCRIPTION:
            await this.resultRepository.update(
              { id: session.result_id },
              {
                [field.field_name]: field.new_value,
                last_updated_by: user.id,
                last_updated_date: new Date(),
              },
            );
            break;

          case AiReviewProposalFieldName.SHORT_TITLE:
            await this.innovationsDevRepository.update(
              { results_id: session.result_id },
              {
                short_title: field.new_value,
                last_updated_by: user.id,
                last_updated_date: new Date(),
              },
            );
            break;
        }

        if (field.was_ai_suggested) {
          await this.aiStateRepository.upsert(
            {
              result_id: session.result_id,
              field_name:
                field.field_name as unknown as ResultFieldAiStateFieldName,
              status: ResultFieldAiStateStatus.ACCEPTED,
              ai_suggestion: field.new_value,
              user_feedback: field.user_feedback,
              last_updated_by: user.id,
              last_ai_proposal_id: field.proposal_id ?? null,
            },
            ['result_id', 'field_name'],
          );
        }

        await this.eventRepository.save({
          session_id: sessionId,
          result_id: session.result_id,
          user_id: user.id,
          event_type: AiReviewEventType.SAVE_CHANGES,
          field_name: field.field_name as unknown as AiReviewEventFieldName,
        });
      }

      return ReturnResponseUtil.format({
        response: {},
        message: 'Changes saved successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getResultState(resultId: number) {
    try {
      const states = await this.aiStateRepository.find({
        where: { result_id: resultId },
      });

      return ReturnResponseUtil.format({
        response: {
          result_id: resultId,
          fields: states.map((state) => ({
            field_name: state.field_name,
            status: state.status,
            ai_suggestion: state.ai_suggestion,
            user_feedback: state.user_feedback,
            last_updated_by: state.last_updated_by,
            updated_at: state.updated_at,
          })),
        },
        message: 'Result state retrieved successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getResultStats(resultId: number) {
    try {
      const sessions = await this.sessionRepository.find({
        where: { result_id: resultId },
      });

      const events = await this.eventRepository
        .createQueryBuilder('event')
        .select('event.event_type', 'event_type')
        .addSelect('COUNT(*)', 'count')
        .where('event.result_id = :resultId', { resultId })
        .groupBy('event.event_type')
        .getRawMany();

      const eventsByType = events.reduce((acc, event) => {
        acc[event.event_type] = parseInt(event.count);
        return acc;
      }, {});

      const eventsByFieldRaw = await this.eventRepository
        .createQueryBuilder('e')
        .select('e.event_type', 'event_type')
        .addSelect('e.field_name', 'field_name')
        .addSelect('COUNT(*)', 'count')
        .where('e.result_id = :resultId', { resultId })
        .andWhere('e.field_name IS NOT NULL')
        .groupBy('e.event_type')
        .addGroupBy('e.field_name')
        .getRawMany();

      const eventsByField = eventsByFieldRaw.reduce((acc, event) => {
        if (!acc[event.event_type]) {
          acc[event.event_type] = {};
        }
        acc[event.event_type][event.field_name] = parseInt(event.count);
        return acc;
      }, {});

      const lastSession = sessions.sort(
        (a, b) => b.opened_at.getTime() - a.opened_at.getTime(),
      )[0];

      return ReturnResponseUtil.format({
        response: {
          result_id: resultId,
          total_sessions: sessions.length,
          total_events: events.reduce(
            (sum, event) => sum + parseInt(event.count),
            0,
          ),
          events_by_type: eventsByType,
          events_by_field: eventsByField,
          last_session_at: lastSession?.opened_at,
        },
        message: 'Result statistics retrieved successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private mapSessionToResponse(
    session: AiReviewSession,
    user: TokenDto,
  ): SessionResponseDto {
    return {
      id: session.id,
      result_id: session.result_id,
      opened_by: user.id,
      opened_at: session.opened_at,
      closed_at: session.closed_at,
      all_sections_completed: session.all_sections_completed,
      status: session.status,
    };
  }

  private mapProposalToResponse(
    proposal: AiReviewProposal,
  ): ProposalResponseDto {
    return {
      id: proposal.id,
      session_id: proposal.session_id,
      field_name: proposal.field_name,
      original_text: proposal.original_text,
      proposed_text: proposal.proposed_text,
      needs_improvement: proposal.needs_improvement,
      created_at: proposal.created_at,
    };
  }

  private mapEventToResponse(
    event: AiReviewEvent,
    user: TokenDto,
  ): EventResponseDto {
    return {
      id: event.id,
      session_id: event.session_id,
      result_id: event.result_id,
      user_id: user.id,
      event_type: event.event_type,
      field_name: event.field_name,
      created_at: event.created_at,
    };
  }
}
