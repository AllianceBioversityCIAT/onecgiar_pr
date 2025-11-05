import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { AiService } from './ai.service';
import {
  AiReviewEvent,
  AiReviewEventFieldName,
  AiReviewEventType,
} from './entities/ai-review-event.entity';
import {
  AiReviewProposal,
  AiReviewProposalFieldName,
} from './entities/ai-review-proposal.entity';
import {
  AiReviewSession,
  AiReviewSessionStatus,
} from './entities/ai-review-session.entity';
import {
  ResultFieldAiState,
  ResultFieldAiStateFieldName,
  ResultFieldAiStateStatus,
} from './entities/result-field-ai-state.entity';
import {
  ResultFieldRevision,
  ResultFieldRevisionFieldName,
} from './entities/result-field-revision.entity';
import { Result } from '../results/entities/result.entity';
import { ResultsInnovationsDev } from '../results/summary/entities/results-innovations-dev.entity';

describe('AiService', () => {
  let service: AiService;
  let sessionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let proposalRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let eventRepository: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let revisionRepository: {
    save: jest.Mock;
  };
  let aiStateRepository: {
    upsert: jest.Mock;
    find: jest.Mock;
  };
  let resultRepository: {
    update: jest.Mock;
  };
  let innovationsDevRepository: {
    update: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: getRepositoryToken(AiReviewSession),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AiReviewProposal),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AiReviewEvent),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ResultFieldRevision),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ResultFieldAiState),
          useValue: {
            upsert: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Result),
          useValue: {
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ResultsInnovationsDev),
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    sessionRepository = module.get(getRepositoryToken(AiReviewSession));
    proposalRepository = module.get(getRepositoryToken(AiReviewProposal));
    eventRepository = module.get(getRepositoryToken(AiReviewEvent));
    revisionRepository = module.get(getRepositoryToken(ResultFieldRevision));
    aiStateRepository = module.get(getRepositoryToken(ResultFieldAiState));
    resultRepository = module.get(getRepositoryToken(Result));
    innovationsDevRepository = module.get(
      getRepositoryToken(ResultsInnovationsDev),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('creates a session and logs an opening event', async () => {
      const dto = { result_id: 1, user_id: 2 };
      const createdSession = {
        id: undefined,
        result_id: dto.result_id,
        opened_by: dto.user_id,
        opened_at: new Date('2024-01-01T00:00:00.000Z'),
        closed_at: null as unknown as Date,
        all_sections_completed: false,
        request_payload: null,
        response_payload: null,
        status: AiReviewSessionStatus.COMPLETED,
        obj_result: null,
        obj_opened_by: null,
        obj_proposals: [],
        obj_events: [],
      } as unknown as AiReviewSession;
      const savedSession = { ...createdSession, id: 10 };

      sessionRepository.create.mockReturnValue(createdSession);
      sessionRepository.save.mockResolvedValue(savedSession);

      const result = await service.createSession(dto);

      expect(sessionRepository.create).toHaveBeenCalledWith({
        result_id: dto.result_id,
        opened_by: dto.user_id,
        all_sections_completed: false,
        status: AiReviewSessionStatus.COMPLETED,
      });
      expect(sessionRepository.save).toHaveBeenCalledWith(createdSession);
      expect(eventRepository.save).toHaveBeenCalledWith({
        session_id: savedSession.id,
        result_id: dto.result_id,
        user_id: dto.user_id,
        event_type: AiReviewEventType.CLICK_REVIEW,
      });
      expect(result).toEqual({
        id: savedSession.id,
        result_id: savedSession.result_id,
        opened_by: savedSession.opened_by,
        opened_at: savedSession.opened_at,
        closed_at: savedSession.closed_at,
        all_sections_completed: savedSession.all_sections_completed,
        status: savedSession.status,
      });
    });
  });

  describe('closeSession', () => {
    it('closes an existing session and logs the event', async () => {
      const now = new Date();
      const session = {
        id: 5,
        result_id: 1,
        opened_by: 3,
        opened_at: now,
        closed_at: null as unknown as Date,
        all_sections_completed: false,
        request_payload: null,
        response_payload: null,
        status: AiReviewSessionStatus.COMPLETED,
        obj_result: null,
        obj_opened_by: null,
        obj_proposals: [],
        obj_events: [],
      } as unknown as AiReviewSession;
      const updatedSession = { ...session, closed_at: now };

      sessionRepository.findOne.mockResolvedValue(session);
      sessionRepository.save.mockResolvedValue(updatedSession);

      const response = await service.closeSession(session.id);

      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { id: session.id },
      });
      expect(sessionRepository.save).toHaveBeenCalledWith({
        ...session,
        closed_at: expect.any(Date),
      });
      expect(eventRepository.save).toHaveBeenCalledWith({
        session_id: session.id,
        result_id: session.result_id,
        user_id: session.opened_by,
        event_type: AiReviewEventType.CLOSE_MODAL,
      });
      expect(response.id).toBe(session.id);
      expect(response.closed_at).toEqual(updatedSession.closed_at);
    });

    it('throws when session is not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(service.closeSession(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createProposals', () => {
    it('stores proposals linked to a session', async () => {
      const session = { id: 1 } as AiReviewSession;
      const dto = {
        proposals: [
          {
            field_name: AiReviewProposalFieldName.TITLE,
            original_text: 'Old',
            proposed_text: 'New',
            needs_improvement: true,
          },
        ],
      };
      const createdProposal = { ...dto.proposals[0], session_id: session.id };
      const savedProposal = {
        ...createdProposal,
        id: 10,
        created_at: new Date(),
      };

      sessionRepository.findOne.mockResolvedValue(session);
      proposalRepository.create.mockReturnValue(createdProposal);
      proposalRepository.save.mockResolvedValue([savedProposal]);

      const result = await service.createProposals(session.id, dto);

      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { id: session.id },
      });
      expect(proposalRepository.create).toHaveBeenCalledWith({
        session_id: session.id,
        field_name: dto.proposals[0].field_name,
        original_text: dto.proposals[0].original_text,
        proposed_text: dto.proposals[0].proposed_text,
        needs_improvement: dto.proposals[0].needs_improvement,
      });
      expect(proposalRepository.save).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: savedProposal.id,
          session_id: savedProposal.session_id,
          field_name: savedProposal.field_name,
          original_text: savedProposal.original_text,
          proposed_text: savedProposal.proposed_text,
          needs_improvement: savedProposal.needs_improvement,
          created_at: savedProposal.created_at,
        },
      ]);
    });

    it('throws when session does not exist', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createProposals(1, {
          proposals: [
            {
              field_name: AiReviewProposalFieldName.TITLE,
              original_text: '',
              proposed_text: '',
            },
          ],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getProposals', () => {
    it('returns proposals ordered by creation date', async () => {
      const proposals = [
        {
          id: 1,
          session_id: 2,
          field_name: AiReviewProposalFieldName.TITLE,
          original_text: 'Old',
          proposed_text: 'New',
          needs_improvement: true,
          created_at: new Date(),
          obj_session: null,
        },
      ] as unknown as AiReviewProposal[];
      proposalRepository.find.mockResolvedValue(proposals);

      const result = await service.getProposals(2);

      expect(proposalRepository.find).toHaveBeenCalledWith({
        where: { session_id: 2 },
        order: { created_at: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(proposals[0].id);
    });
  });

  describe('createEvent', () => {
    it('persists event information', async () => {
      const dto = {
        session_id: 1,
        result_id: 2,
        user_id: 3,
        event_type: AiReviewEventType.APPLY_PROPOSAL,
        field_name: AiReviewEventFieldName.TITLE,
      };
      const createdEvent = { ...dto };
      const savedEvent = {
        ...createdEvent,
        id: 20,
        created_at: new Date(),
      };

      eventRepository.create.mockReturnValue(createdEvent);
      eventRepository.save.mockResolvedValue(savedEvent);

      const result = await service.createEvent(dto);

      expect(eventRepository.create).toHaveBeenCalledWith(dto);
      expect(eventRepository.save).toHaveBeenCalledWith(createdEvent);
      expect(result).toEqual({
        id: savedEvent.id,
        session_id: savedEvent.session_id,
        result_id: savedEvent.result_id,
        user_id: savedEvent.user_id,
        event_type: savedEvent.event_type,
        field_name: savedEvent.field_name,
        created_at: savedEvent.created_at,
      });
    });
  });

  describe('saveChanges', () => {
    it('stores revisions and updates AI state when needed', async () => {
      const session = {
        id: 1,
        result_id: 2,
        opened_by: 3,
        opened_at: new Date(),
        closed_at: null as unknown as Date,
        all_sections_completed: false,
        request_payload: null,
        response_payload: null,
        status: AiReviewSessionStatus.COMPLETED,
        obj_result: null,
        obj_opened_by: null,
        obj_proposals: [],
        obj_events: [],
      } as unknown as AiReviewSession;
      const dto = {
        user_id: 4,
        fields: [
          {
            field_name: AiReviewProposalFieldName.TITLE,
            new_value: 'Updated title',
            change_reason: 'AI suggestion',
            was_ai_suggested: true,
            user_feedback: 'Looks good',
          },
          {
            field_name: AiReviewProposalFieldName.DESCRIPTION,
            new_value: 'Updated description',
            change_reason: 'Manual',
            was_ai_suggested: false,
          },
        ],
      };

      sessionRepository.findOne.mockResolvedValue(session);

      await service.saveChanges(session.id, dto);

      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { id: session.id },
      });
      expect(revisionRepository.save).toHaveBeenCalledTimes(2);
      expect(revisionRepository.save).toHaveBeenCalledWith({
        result_id: session.result_id,
        user_id: dto.user_id,
        field_name: ResultFieldRevisionFieldName.TITLE,
        new_value: dto.fields[0].new_value,
        change_reason: dto.fields[0].change_reason,
      });
      expect(resultRepository.update).toHaveBeenCalledWith(
        { id: session.result_id },
        {
          [dto.fields[0].field_name]: dto.fields[0].new_value,
          last_updated_by: dto.user_id,
          last_updated_date: expect.any(Date),
        },
      );
      expect(resultRepository.update).toHaveBeenCalledWith(
        { id: session.result_id },
        {
          [dto.fields[1].field_name]: dto.fields[1].new_value,
          last_updated_by: dto.user_id,
          last_updated_date: expect.any(Date),
        },
      );
      expect(innovationsDevRepository.update).not.toHaveBeenCalled();
      expect(aiStateRepository.upsert).toHaveBeenCalledWith(
        {
          result_id: session.result_id,
          field_name: ResultFieldAiStateFieldName.TITLE,
          status: ResultFieldAiStateStatus.ACCEPTED,
          ai_suggestion: dto.fields[0].new_value,
          user_feedback: dto.fields[0].user_feedback,
          last_updated_by: dto.user_id,
        },
        ['result_id', 'field_name'],
      );
      expect(eventRepository.save).toHaveBeenCalledWith({
        session_id: session.id,
        result_id: session.result_id,
        user_id: dto.user_id,
        event_type: AiReviewEventType.SAVE_CHANGES,
      });
    });

    it('throws when session is missing', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.saveChanges(1, { user_id: 1, fields: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getResultState', () => {
    it('returns AI state per field for a result', async () => {
      const states = [
        {
          id: 1,
          result_id: 2,
          field_name: ResultFieldAiStateFieldName.TITLE,
          status: ResultFieldAiStateStatus.ACCEPTED,
          ai_suggestion: 'Suggestion',
          user_feedback: 'feedback',
          last_updated_by: 3,
          created_at: new Date(),
          updated_at: new Date(),
          obj_result: null,
          obj_last_updated_by: null,
        },
      ] as unknown as ResultFieldAiState[];
      aiStateRepository.find.mockResolvedValue(states);

      const result = await service.getResultState(2);

      expect(aiStateRepository.find).toHaveBeenCalledWith({
        where: { result_id: 2 },
      });
      expect(result).toEqual({
        result_id: 2,
        fields: [
          {
            field_name: states[0].field_name,
            status: states[0].status,
            ai_suggestion: states[0].ai_suggestion,
            user_feedback: states[0].user_feedback,
            last_updated_by: states[0].last_updated_by,
            updated_at: states[0].updated_at,
          },
        ],
      });
    });
  });

  describe('getResultStats', () => {
    it('aggregates session and event statistics', async () => {
      const sessions = [
        {
          id: 1,
          result_id: 9,
          opened_by: 1,
          opened_at: new Date('2024-01-01T00:00:00.000Z'),
          closed_at: null as unknown as Date,
          all_sections_completed: false,
          request_payload: null,
          response_payload: null,
          status: AiReviewSessionStatus.COMPLETED,
          obj_result: null,
          obj_opened_by: null,
          obj_proposals: [],
          obj_events: [],
        },
        {
          id: 2,
          result_id: 9,
          opened_by: 2,
          opened_at: new Date('2024-02-01T00:00:00.000Z'),
          closed_at: null as unknown as Date,
          all_sections_completed: false,
          request_payload: null,
          response_payload: null,
          status: AiReviewSessionStatus.COMPLETED,
          obj_result: null,
          obj_opened_by: null,
          obj_proposals: [],
          obj_events: [],
        },
      ] as unknown as AiReviewSession[];
      sessionRepository.find.mockResolvedValue(sessions);

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { event_type: AiReviewEventType.CLICK_REVIEW, count: '2' },
          { event_type: AiReviewEventType.SAVE_CHANGES, count: '1' },
        ]),
      } as unknown as SelectQueryBuilder<AiReviewEvent>;
      eventRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getResultStats(9);

      expect(sessionRepository.find).toHaveBeenCalledWith({
        where: { result_id: 9 },
      });
      expect(eventRepository.createQueryBuilder).toHaveBeenCalledWith('event');
      expect(qb.select).toHaveBeenCalledWith('event.event_type', 'event_type');
      expect(qb.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
      expect(qb.where).toHaveBeenCalledWith('event.result_id = :resultId', {
        resultId: 9,
      });
      expect(qb.groupBy).toHaveBeenCalledWith('event.event_type');
      expect(result).toEqual({
        result_id: 9,
        total_sessions: sessions.length,
        total_events: 3,
        events_by_type: {
          CLICK_REVIEW: 2,
          SAVE_CHANGES: 1,
        },
        last_session_at: new Date('2024-02-01T00:00:00.000Z'),
      });
    });
  });
});
