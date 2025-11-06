import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  ResultFieldRevisionProvenance,
} from './entities/result-field-revision.entity';
import { Result } from '../results/entities/result.entity';
import { ResultsInnovationsDev } from '../results/summary/entities/results-innovations-dev.entity';

const buildUser = (id: number) => ({
  id,
  email: `user${id}@example.com`,
  first_name: 'Test',
  last_name: 'User',
});

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
    findOne: jest.Mock;
  };
  let innovationsDevRepository: {
    update: jest.Mock;
    findOne: jest.Mock;
    exists: jest.Mock;
  };

  beforeEach(async () => {
    sessionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    proposalRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    eventRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    revisionRepository = {
      save: jest.fn(),
    };
    aiStateRepository = {
      upsert: jest.fn(),
      find: jest.fn(),
    };
    resultRepository = {
      update: jest.fn(),
      findOne: jest.fn(),
    };
    innovationsDevRepository = {
      update: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: getRepositoryToken(AiReviewSession),
          useValue: sessionRepository,
        },
        {
          provide: getRepositoryToken(AiReviewProposal),
          useValue: proposalRepository,
        },
        {
          provide: getRepositoryToken(AiReviewEvent),
          useValue: eventRepository,
        },
        {
          provide: getRepositoryToken(ResultFieldRevision),
          useValue: revisionRepository,
        },
        {
          provide: getRepositoryToken(ResultFieldAiState),
          useValue: aiStateRepository,
        },
        {
          provide: getRepositoryToken(Result),
          useValue: resultRepository,
        },
        {
          provide: getRepositoryToken(ResultsInnovationsDev),
          useValue: innovationsDevRepository,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('creates a session and logs the opening event', async () => {
      const dto = { result_id: 10, user_id: 20 };
      const user = buildUser(20);
      const createdSession = {
        result_id: dto.result_id,
        opened_by: dto.user_id,
        all_sections_completed: false,
        status: AiReviewSessionStatus.COMPLETED,
      } as AiReviewSession;
      const savedSession = {
        ...createdSession,
        id: 44,
        opened_at: new Date('2024-01-01T00:00:00.000Z'),
        closed_at: null,
      } as AiReviewSession;

      sessionRepository.create.mockReturnValue(createdSession);
      sessionRepository.save.mockResolvedValue(savedSession);

      const response = await service.createSession(dto, user);

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
      expect(response).toEqual({
        id: savedSession.id,
        result_id: savedSession.result_id,
        opened_by: user.id,
        opened_at: savedSession.opened_at,
        closed_at: savedSession.closed_at,
        all_sections_completed: savedSession.all_sections_completed,
        status: savedSession.status,
      });
    });
  });

  describe('closeSession', () => {
    it('closes a session and logs the event', async () => {
      const user = buildUser(99);
      const session = {
        id: 7,
        result_id: 4,
        opened_by: 5,
        opened_at: new Date('2024-01-01T00:00:00.000Z'),
        closed_at: null,
        all_sections_completed: false,
        status: AiReviewSessionStatus.COMPLETED,
      } as AiReviewSession;
      const updatedSession = { ...session, closed_at: new Date() };

      sessionRepository.findOne.mockResolvedValue(session);
      sessionRepository.save.mockResolvedValue(updatedSession);

      const result = await service.closeSession(session.id, user);

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
        user_id: user.id,
        event_type: AiReviewEventType.CLOSE_MODAL,
      });
      expect(result.closed_at).toEqual(updatedSession.closed_at);
      expect(result.opened_by).toBe(user.id);
    });

    it('throws when session does not exist', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.closeSession(1, buildUser(2)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createProposals', () => {
    it('stores proposals for a session', async () => {
      const session = { id: 1 } as AiReviewSession;
      const dto = {
        proposals: [
          {
            field_name: AiReviewProposalFieldName.TITLE,
            original_text: 'old',
            proposed_text: 'new',
            needs_improvement: true,
          },
        ],
      };
      const createdProposal = {
        session_id: session.id,
        ...dto.proposals[0],
      } as AiReviewProposal;
      const savedProposal = {
        ...createdProposal,
        id: 8,
        created_at: new Date(),
      } as AiReviewProposal;

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
      expect(proposalRepository.save).toHaveBeenCalledWith([createdProposal]);
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
  });

  describe('createEvent', () => {
    it('creates an event and overrides the user_id', async () => {
      const user = buildUser(55);
      const dto = {
        session_id: 1,
        result_id: 2,
        event_type: AiReviewEventType.APPLY_PROPOSAL,
      };
      const session = { id: dto.session_id, result_id: dto.result_id };
      const createdEvent = {
        ...dto,
        user_id: user.id,
        field_name: null,
      } as unknown as AiReviewEvent;
      const savedEvent = {
        ...createdEvent,
        id: 9,
        created_at: new Date(),
      } as AiReviewEvent;

      sessionRepository.findOne.mockResolvedValue(session);
      eventRepository.create.mockReturnValue(createdEvent);
      eventRepository.save.mockResolvedValue(savedEvent);

      const result = await service.createEvent(dto, user);

      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { id: dto.session_id },
      });
      expect(eventRepository.create).toHaveBeenCalledWith({
        ...dto,
        user_id: user.id,
      });
      expect(eventRepository.save).toHaveBeenCalledWith(createdEvent);
      expect(result).toEqual({
        id: savedEvent.id,
        session_id: savedEvent.session_id,
        result_id: savedEvent.result_id,
        user_id: user.id,
        event_type: savedEvent.event_type,
        field_name: savedEvent.field_name,
        created_at: savedEvent.created_at,
      });
    });

    it('validates short_title events require innovations data', async () => {
      const user = buildUser(5);
      const dto = {
        session_id: 3,
        result_id: 4,
        event_type: AiReviewEventType.REGENERATE,
        field_name: AiReviewEventFieldName.SHORT_TITLE,
      };
      const session = { id: dto.session_id, result_id: dto.result_id };

      sessionRepository.findOne.mockResolvedValue(session);
      innovationsDevRepository.exists.mockResolvedValue(false);

      await expect(service.createEvent(dto, user)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(innovationsDevRepository.exists).toHaveBeenCalledWith({
        where: { results_id: session.result_id },
      });
    });

    it('throws when session does not exist', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createEvent(
          {
            session_id: 1,
            result_id: 2,
            event_type: AiReviewEventType.APPLY_PROPOSAL,
          },
          buildUser(1),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('saveChanges', () => {
    it('persists revisions and updates result fields', async () => {
      const user = buildUser(100);
      const session = { id: 1, result_id: 2 } as AiReviewSession;
      const dto = {
        user_id: 200,
        fields: [
          {
            field_name: AiReviewProposalFieldName.TITLE,
            new_value: 'Updated title',
            change_reason: 'AI suggestion',
            was_ai_suggested: true,
            user_feedback: 'Nice',
            proposal_id: 10,
          },
          {
            field_name: AiReviewProposalFieldName.DESCRIPTION,
            new_value: 'Updated description',
            change_reason: 'Manual edit',
            was_ai_suggested: false,
          },
        ],
      };

      sessionRepository.findOne.mockResolvedValue(session);
      resultRepository.findOne
        .mockResolvedValueOnce({ title: 'Previous title' })
        .mockResolvedValueOnce({ description: 'Previous description' });

      await service.saveChanges(session.id, dto, user);

      expect(resultRepository.findOne).toHaveBeenCalledWith({
        where: { id: session.result_id },
      });
      expect(revisionRepository.save).toHaveBeenNthCalledWith(1, {
        result_id: session.result_id,
        user_id: user.id,
        field_name: ResultFieldRevisionFieldName.TITLE,
        old_value: 'Previous title',
        new_value: dto.fields[0].new_value,
        change_reason: dto.fields[0].change_reason,
        provenance: ResultFieldRevisionProvenance.AI_SUGGESTED,
        proposal_id: dto.fields[0].proposal_id,
      });
      expect(revisionRepository.save).toHaveBeenNthCalledWith(2, {
        result_id: session.result_id,
        user_id: user.id,
        field_name: ResultFieldRevisionFieldName.DESCRIPTION,
        old_value: 'Previous description',
        new_value: dto.fields[1].new_value,
        change_reason: dto.fields[1].change_reason,
        provenance: ResultFieldRevisionProvenance.USER_EDIT,
        proposal_id: null,
      });
      expect(resultRepository.update).toHaveBeenNthCalledWith(
        1,
        { id: session.result_id },
        {
          [dto.fields[0].field_name]: dto.fields[0].new_value,
          last_updated_by: user.id,
          last_updated_date: expect.any(Date),
        },
      );
      expect(resultRepository.update).toHaveBeenNthCalledWith(
        2,
        { id: session.result_id },
        {
          [dto.fields[1].field_name]: dto.fields[1].new_value,
          last_updated_by: user.id,
          last_updated_date: expect.any(Date),
        },
      );
      expect(aiStateRepository.upsert).toHaveBeenCalledWith(
        {
          result_id: session.result_id,
          field_name: ResultFieldAiStateFieldName.TITLE,
          status: ResultFieldAiStateStatus.ACCEPTED,
          ai_suggestion: dto.fields[0].new_value,
          user_feedback: dto.fields[0].user_feedback,
          last_updated_by: user.id,
          last_ai_proposal_id: dto.fields[0].proposal_id,
        },
        ['result_id', 'field_name'],
      );
      expect(innovationsDevRepository.update).not.toHaveBeenCalled();
      expect(eventRepository.save).toHaveBeenNthCalledWith(1, {
        session_id: session.id,
        result_id: session.result_id,
        user_id: user.id,
        event_type: AiReviewEventType.SAVE_CHANGES,
        field_name: AiReviewEventFieldName.TITLE,
      });
      expect(eventRepository.save).toHaveBeenNthCalledWith(2, {
        session_id: session.id,
        result_id: session.result_id,
        user_id: user.id,
        event_type: AiReviewEventType.SAVE_CHANGES,
        field_name: AiReviewEventFieldName.DESCRIPTION,
      });
    });

    it('updates short_title fields', async () => {
      const user = buildUser(5);
      const session = { id: 1, result_id: 10 } as AiReviewSession;
      const dto = {
        user_id: 6,
        fields: [
          {
            field_name: AiReviewProposalFieldName.SHORT_TITLE,
            new_value: 'New short title',
            was_ai_suggested: true,
            change_reason: 'AI applied',
            proposal_id: 15,
            user_feedback: 'Great suggestion',
          },
        ],
      };

      sessionRepository.findOne.mockResolvedValue(session);
      innovationsDevRepository.exists.mockResolvedValue(true);
      innovationsDevRepository.findOne.mockResolvedValue({
        results_id: session.result_id,
        short_title: 'Old short',
      });

      await service.saveChanges(session.id, dto, user);

      expect(innovationsDevRepository.exists).toHaveBeenCalledWith({
        where: { results_id: session.result_id },
      });
      expect(innovationsDevRepository.findOne).toHaveBeenCalledWith({
        where: { results_id: session.result_id },
      });
      expect(revisionRepository.save).toHaveBeenCalledWith({
        result_id: session.result_id,
        user_id: user.id,
        field_name: ResultFieldRevisionFieldName.SHORT_TITLE,
        old_value: 'Old short',
        new_value: dto.fields[0].new_value,
        change_reason: dto.fields[0].change_reason,
        provenance: ResultFieldRevisionProvenance.AI_SUGGESTED,
        proposal_id: dto.fields[0].proposal_id,
      });
      expect(innovationsDevRepository.update).toHaveBeenCalledWith(
        { results_id: session.result_id },
        {
          short_title: dto.fields[0].new_value,
          last_updated_by: user.id,
          last_updated_date: expect.any(Date),
        },
      );
      expect(resultRepository.update).not.toHaveBeenCalled();
      expect(aiStateRepository.upsert).toHaveBeenCalledWith(
        {
          result_id: session.result_id,
          field_name: ResultFieldAiStateFieldName.SHORT_TITLE,
          status: ResultFieldAiStateStatus.ACCEPTED,
          ai_suggestion: dto.fields[0].new_value,
          user_feedback: dto.fields[0].user_feedback,
          last_updated_by: user.id,
          last_ai_proposal_id: dto.fields[0].proposal_id,
        },
        ['result_id', 'field_name'],
      );
      expect(eventRepository.save).toHaveBeenCalledWith({
        session_id: session.id,
        result_id: session.result_id,
        user_id: user.id,
        event_type: AiReviewEventType.SAVE_CHANGES,
        field_name: AiReviewEventFieldName.SHORT_TITLE,
      });
    });

    it('throws when session is missing', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.saveChanges(1, { fields: [] }, buildUser(1)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('validates short_title availability', async () => {
      const session = { id: 1, result_id: 2 } as AiReviewSession;
      const dto = {
        user_id: 1,
        fields: [
          {
            field_name: AiReviewProposalFieldName.SHORT_TITLE,
            new_value: 'Anything',
          },
        ],
      };

      sessionRepository.findOne.mockResolvedValue(session);
      innovationsDevRepository.exists.mockResolvedValue(false);

      await expect(
        service.saveChanges(session.id, dto, buildUser(1)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(innovationsDevRepository.exists).toHaveBeenCalledWith({
        where: { results_id: session.result_id },
      });
    });
  });

  describe('getResultState', () => {
    it('returns AI states for a result', async () => {
      const states: ResultFieldAiState[] = [
        {
          id: 1,
          result_id: 2,
          field_name: ResultFieldAiStateFieldName.TITLE,
          status: ResultFieldAiStateStatus.ACCEPTED,
          ai_suggestion: 'Text',
          user_feedback: 'Feedback',
          last_updated_by: 3,
          created_at: new Date(),
          updated_at: new Date(),
        } as ResultFieldAiState,
      ];
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
    it('aggregates stats including events by field', async () => {
      const sessions: AiReviewSession[] = [
        {
          id: 1,
          result_id: 9,
          opened_by: 1,
          opened_at: new Date('2024-01-01T00:00:00.000Z'),
          closed_at: null,
          all_sections_completed: false,
          status: AiReviewSessionStatus.COMPLETED,
        } as AiReviewSession,
        {
          id: 2,
          result_id: 9,
          opened_by: 2,
          opened_at: new Date('2024-02-01T00:00:00.000Z'),
          closed_at: null,
          all_sections_completed: true,
          status: AiReviewSessionStatus.COMPLETED,
        } as AiReviewSession,
      ];
      const eventsByType = [
        { event_type: AiReviewEventType.CLICK_REVIEW, count: '2' },
        { event_type: AiReviewEventType.SAVE_CHANGES, count: '1' },
      ];
      const eventsByField = [
        {
          event_type: AiReviewEventType.SAVE_CHANGES,
          field_name: AiReviewEventFieldName.TITLE,
          count: '1',
        },
      ];

      sessionRepository.find.mockResolvedValue(sessions);
      const expectedLastSession = sessions[1].opened_at;

      const qbEvents = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(eventsByType),
      } as unknown as SelectQueryBuilder<AiReviewEvent>;

      const qbFields = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(eventsByField),
      } as unknown as SelectQueryBuilder<AiReviewEvent>;

      eventRepository.createQueryBuilder
        .mockReturnValueOnce(qbEvents)
        .mockReturnValueOnce(qbFields);

      const result = await service.getResultStats(9);

      expect(sessionRepository.find).toHaveBeenCalledWith({
        where: { result_id: 9 },
      });
      expect(eventRepository.createQueryBuilder).toHaveBeenNthCalledWith(
        1,
        'event',
      );
      expect(eventRepository.createQueryBuilder).toHaveBeenNthCalledWith(
        2,
        'e',
      );
      expect(result).toMatchObject({
        result_id: 9,
        total_sessions: sessions.length,
        total_events: 3,
        events_by_type: {
          CLICK_REVIEW: 2,
          SAVE_CHANGES: 1,
        },
        last_session_at: expectedLastSession,
      });
      expect(result.events_by_field).toEqual({
        SAVE_CHANGES: {
          [AiReviewEventFieldName.TITLE]: 1,
        },
      });
    });
  });
});
