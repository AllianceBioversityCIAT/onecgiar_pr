import { HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import {
  AiReviewEventFieldName,
  AiReviewEventType,
} from './entities/ai-review-event.entity';
import { AiReviewProposalFieldName } from './entities/ai-review-proposal.entity';
import { AiReviewSessionStatus } from './entities/ai-review-session.entity';
import { ResultFieldAiStateStatus } from './entities/result-field-ai-state.entity';
import { ResultFieldRevisionProvenance } from './entities/result-field-revision.entity';
import { ReturnResponseUtil } from '../../shared/utils/response.util';

type MockRepository = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  createQueryBuilder: jest.Mock;
  exists: jest.Mock;
  upsert: jest.Mock;
};

const createMockRepository = (): MockRepository => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
  exists: jest.fn(),
  upsert: jest.fn(),
});

describe('AiService', () => {
  let service: AiService;
  let sessionRepository: MockRepository;
  let proposalRepository: MockRepository;
  let eventRepository: MockRepository;
  let revisionRepository: MockRepository;
  let aiStateRepository: MockRepository;
  let resultRepository: MockRepository;
  let innovationsDevRepository: MockRepository;
  const handlersError = {
    returnErrorRes: jest.fn((payload) => payload),
  };

  const user = {
    id: 4,
    email: 'user@example.org',
  } as any;

  beforeEach(() => {
    sessionRepository = createMockRepository();
    proposalRepository = createMockRepository();
    eventRepository = createMockRepository();
    revisionRepository = createMockRepository();
    aiStateRepository = createMockRepository();
    resultRepository = createMockRepository();
    innovationsDevRepository = createMockRepository();

    service = new AiService(
      sessionRepository as any,
      proposalRepository as any,
      eventRepository as any,
      revisionRepository as any,
      aiStateRepository as any,
      resultRepository as any,
      innovationsDevRepository as any,
      handlersError as any,
    );
  });

  const mockQueryBuilder = (result: any) => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(result),
      getRawMany: jest.fn().mockResolvedValue(result),
    };
    return qb;
  };

  describe('getResultContext', () => {
    it('returns result fields including short title when available', async () => {
      resultRepository.findOne.mockResolvedValue({
        id: 7,
        title: 'Result title',
        description: 'Description',
      });
      const innovationQB = mockQueryBuilder({ short_title: 'Shorty' });
      innovationsDevRepository.createQueryBuilder.mockReturnValue(innovationQB);

      const response = await service.getResultContext(7);

      expect(response).toEqual(
        ReturnResponseUtil.format({
          response: [
            { field_name: 'title', original_text: 'Result title' },
            { field_name: 'description', original_text: 'Description' },
            { field_name: 'short_title', original_text: 'Shorty' },
          ],
          message: 'Successful response',
          statusCode: HttpStatus.OK,
        }),
      );
    });

    it('delegates error when result does not exist', async () => {
      resultRepository.findOne.mockResolvedValue(null);
      const handled = { statusCode: 404 };
      handlersError.returnErrorRes.mockReturnValueOnce(handled);

      const response = await service.getResultContext(99);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({ message: 'Result not found' }),
        debug: true,
      });
      expect(response).toBe(handled);
    });
  });

  describe('createSession', () => {
    it('persists session and registers opening event', async () => {
      const dto = { result_id: 30 };
      const savedSession = {
        id: 11,
        result_id: 30,
        opened_at: new Date(),
        closed_at: null,
        all_sections_completed: false,
        status: AiReviewSessionStatus.COMPLETED,
      };
      sessionRepository.create.mockReturnValue(savedSession);
      sessionRepository.save.mockResolvedValue(savedSession);
      eventRepository.save.mockResolvedValue({});

      const response = await service.createSession(dto, user);

      expect(response).toEqual(
        ReturnResponseUtil.format({
          response: expect.objectContaining({
            id: 11,
            result_id: 30,
            opened_by: user.id,
            status: AiReviewSessionStatus.COMPLETED,
          }),
          message: 'Session created successfully',
          statusCode: HttpStatus.CREATED,
        }),
      );
      expect(eventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 11,
          result_id: 30,
          user_id: user.id,
          event_type: AiReviewEventType.CLICK_REVIEW,
        }),
      );
    });
  });

  describe('closeSession', () => {
    it('returns handler error when session is not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);
      const handled = { statusCode: 404 };
      handlersError.returnErrorRes.mockReturnValueOnce(handled);

      const response = await service.closeSession(10, user);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({ message: 'Session not found' }),
        debug: true,
      });
      expect(response).toBe(handled);
    });
  });

  describe('createProposals', () => {
    it('saves proposals for a session', async () => {
      sessionRepository.findOne.mockResolvedValue({ id: 5 });
      const saved = [
        {
          id: 1,
          session_id: 5,
          field_name: AiReviewProposalFieldName.TITLE,
          original_text: 'Old',
          proposed_text: 'New',
          needs_improvement: true,
        },
      ];
      proposalRepository.create.mockImplementation((input) => input);
      proposalRepository.save.mockResolvedValue(saved);

      const response = await service.createProposals(5, {
        proposals: saved,
      });

      expect(response).toEqual(
        ReturnResponseUtil.format({
          response: saved.map((p) => ({
            id: p.id,
            session_id: p.session_id,
            field_name: p.field_name,
            original_text: p.original_text,
            proposed_text: p.proposed_text,
            needs_improvement: p.needs_improvement,
            created_at: undefined,
          })),
          message: 'Proposals created successfully',
          statusCode: HttpStatus.CREATED,
        }),
      );
    });
  });

  describe('createEvent', () => {
    it('rejects short_title events when innovation record is missing', async () => {
      sessionRepository.findOne.mockResolvedValue({
        id: 100,
        result_id: 77,
      });
      innovationsDevRepository.exists.mockResolvedValue(false);
      const handled = { statusCode: 400 };
      handlersError.returnErrorRes.mockReturnValueOnce(handled);

      const response = await service.createEvent(
        {
          session_id: 100,
          result_id: 77,
          event_type: AiReviewEventType.APPLY_PROPOSAL,
          field_name: AiReviewEventFieldName.SHORT_TITLE,
        },
        user,
      );

      expect(response).toBe(handled);
      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message:
            'short_title field is only applicable for Innovation Development results',
        }),
        debug: true,
      });
      expect(eventRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('saveChanges', () => {
    it('updates result fields, revisions and AI state', async () => {
      const session = { id: 1, result_id: 50 };
      sessionRepository.findOne.mockResolvedValue(session);
      resultRepository.findOne.mockResolvedValue({
        id: 50,
        title: 'Old title',
      });

      const dto = {
        fields: [
          {
            field_name: AiReviewProposalFieldName.TITLE,
            new_value: 'New title',
            change_reason: 'Applied AI suggestion',
            was_ai_suggested: true,
            proposal_id: 9,
          },
        ],
      };

      const response = await service.saveChanges(1, dto as any, user);

      expect(revisionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 50,
          field_name: AiReviewProposalFieldName.TITLE,
          old_value: 'Old title',
          new_value: 'New title',
          provenance: ResultFieldRevisionProvenance.AI_SUGGESTED,
        }),
      );
      expect(resultRepository.update).toHaveBeenCalledWith(
        { id: 50 },
        expect.objectContaining({
          title: 'New title',
          last_updated_by: user.id,
        }),
      );
      expect(aiStateRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 50,
          field_name: AiReviewProposalFieldName.TITLE,
          status: ResultFieldAiStateStatus.ACCEPTED,
        }),
        ['result_id', 'field_name'],
      );
      expect(eventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 1,
          event_type: AiReviewEventType.SAVE_CHANGES,
          field_name: AiReviewEventFieldName.TITLE,
        }),
      );
      expect(response).toEqual(
        ReturnResponseUtil.format({
          response: {},
          message: 'Changes saved successfully',
          statusCode: HttpStatus.OK,
        }),
      );
    });
  });

  describe('getResultState', () => {
    it('returns AI state per field', async () => {
      const states = [
        {
          field_name: AiReviewProposalFieldName.TITLE,
          status: ResultFieldAiStateStatus.ACCEPTED,
          ai_suggestion: 'New title',
          user_feedback: 'Great',
          last_updated_by: 1,
          updated_at: new Date(),
        },
      ];
      aiStateRepository.find.mockResolvedValue(states);

      const response = await service.getResultState(80);

      expect(response).toEqual(
        ReturnResponseUtil.format({
          response: {
            result_id: 80,
            fields: [
              {
                field_name: AiReviewProposalFieldName.TITLE,
                status: ResultFieldAiStateStatus.ACCEPTED,
                ai_suggestion: 'New title',
                user_feedback: 'Great',
                last_updated_by: 1,
                updated_at: states[0].updated_at,
              },
            ],
          },
          message: 'Result state retrieved successfully',
          statusCode: HttpStatus.OK,
        }),
      );
    });
  });

  describe('getResultStats', () => {
    it('aggregates sessions and events', async () => {
      const openedAt = new Date();
      sessionRepository.find.mockResolvedValue([
        { id: 1, opened_at: openedAt, result_id: 90 },
        {
          id: 2,
          opened_at: new Date(openedAt.getTime() - 1000),
          result_id: 90,
        },
      ]);

      const qbEventsByType = mockQueryBuilder([
        { event_type: AiReviewEventType.CLICK_REVIEW, count: '2' },
      ]);
      const qbEventsByField = mockQueryBuilder([
        {
          event_type: AiReviewEventType.APPLY_PROPOSAL,
          field_name: AiReviewEventFieldName.TITLE,
          count: '1',
        },
      ]);
      eventRepository.createQueryBuilder
        .mockReturnValueOnce(qbEventsByType)
        .mockReturnValueOnce(qbEventsByField);

      const response = await service.getResultStats(90);

      expect(response).toEqual(
        ReturnResponseUtil.format({
          response: {
            result_id: 90,
            total_sessions: 2,
            total_events: 2,
            events_by_type: {
              [AiReviewEventType.CLICK_REVIEW]: 2,
            },
            events_by_field: {
              [AiReviewEventType.APPLY_PROPOSAL]: {
                [AiReviewEventFieldName.TITLE]: 1,
              },
            },
            last_session_at: openedAt,
          },
          message: 'Result statistics retrieved successfully',
          statusCode: HttpStatus.OK,
        }),
      );
    });
  });
});
