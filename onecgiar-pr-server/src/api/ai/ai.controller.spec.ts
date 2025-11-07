import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import {
  AiReviewEventFieldName,
  AiReviewEventType,
} from './entities/ai-review-event.entity';

describe('AiController', () => {
  let controller: AiController;
  let service: {
    getResultContext: jest.Mock;
    createSession: jest.Mock;
    closeSession: jest.Mock;
    createProposals: jest.Mock;
    getProposals: jest.Mock;
    createEvent: jest.Mock;
    saveChanges: jest.Mock;
    getResultState: jest.Mock;
    getResultStats: jest.Mock;
  };

  const user = {
    id: 1,
    username: 'testuser',
    email: 'testuser@example.com',
    first_name: 'Test',
    last_name: 'User',
  };

  beforeEach(async () => {
    service = {
      getResultContext: jest.fn(),
      createSession: jest.fn(),
      closeSession: jest.fn(),
      createProposals: jest.fn(),
      getProposals: jest.fn(),
      createEvent: jest.fn(),
      saveChanges: jest.fn(),
      getResultState: jest.fn(),
      getResultStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const wrapResponse = (response: any, message = 'ok', statusCode = 200) => ({
    response,
    message,
    statusCode,
  });

  it('fetches result context', async () => {
    const payload = [{ field_name: 'title', original_text: 'Sample' }];
    const wrapped = wrapResponse(
      payload,
      'Result context retrieved successfully',
      200,
    );
    service.getResultContext.mockResolvedValue(wrapped);

    await expect(controller.getResultContext(5)).resolves.toEqual(wrapped);
    expect(service.getResultContext).toHaveBeenCalledWith(5);
  });

  it('creates a session', async () => {
    const dto = { result_id: 1, user_id: 2 };
    const expected = { id: 10 };
    const wrapped = wrapResponse(expected, 'Session created successfully', 201);
    service.createSession.mockResolvedValue(wrapped);

    await expect(controller.createSession(dto, user)).resolves.toEqual(wrapped);
    expect(service.createSession).toHaveBeenCalledWith(dto, user);
  });

  it('closes a session', async () => {
    const expected = { id: 1, closed_at: new Date() };
    const wrapped = wrapResponse(expected, 'Session closed successfully', 200);
    service.closeSession.mockResolvedValue(wrapped);

    await expect(controller.closeSession(1, user)).resolves.toEqual(wrapped);
    expect(service.closeSession).toHaveBeenCalledWith(1, user);
  });

  it('stores proposals for a session', async () => {
    const dto = { proposals: [] };
    const expected = [{ id: 1 }];
    const wrapped = wrapResponse(
      expected,
      'Proposals created successfully',
      201,
    );
    service.createProposals.mockResolvedValue(wrapped);

    await expect(controller.createProposals(5, dto)).resolves.toEqual(wrapped);
    expect(service.createProposals).toHaveBeenCalledWith(5, dto);
  });

  it('retrieves proposals', async () => {
    const expected = [{ id: 1 }];
    const wrapped = wrapResponse(
      expected,
      'Proposals retrieved successfully',
      200,
    );
    service.getProposals.mockResolvedValue(wrapped);

    await expect(controller.getProposals(7)).resolves.toEqual(wrapped);
    expect(service.getProposals).toHaveBeenCalledWith(7);
  });

  it('logs an event', async () => {
    const dto = {
      session_id: 1,
      result_id: 2,
      event_type: AiReviewEventType.APPLY_PROPOSAL,
      field_name: AiReviewEventFieldName.TITLE,
    };
    const expected = { id: 2 };
    const wrapped = wrapResponse(expected, 'Event created successfully', 201);
    service.createEvent.mockResolvedValue(wrapped);

    await expect(controller.createEvent(dto, user)).resolves.toEqual(wrapped);
    expect(service.createEvent).toHaveBeenCalledWith(dto, user);
  });

  it('saves final changes', async () => {
    const dto = { fields: [], user_id: 1 };
    const wrapped = wrapResponse({}, 'Changes saved successfully', 200);
    service.saveChanges.mockResolvedValue(wrapped);

    await expect(controller.saveChanges(3, dto, user)).resolves.toEqual(
      wrapped,
    );
    expect(service.saveChanges).toHaveBeenCalledWith(3, dto, user);
  });

  it('returns AI state for a result', async () => {
    const expected = { result_id: 1, fields: [] };
    const wrapped = wrapResponse(
      expected,
      'Result state retrieved successfully',
      200,
    );
    service.getResultState.mockResolvedValue(wrapped);

    await expect(controller.getResultState(1)).resolves.toEqual(wrapped);
    expect(service.getResultState).toHaveBeenCalledWith(1);
  });

  it('returns stats for a result', async () => {
    const expected = { result_id: 1, total_sessions: 0 };
    const wrapped = wrapResponse(
      expected,
      'Result statistics retrieved successfully',
      200,
    );
    service.getResultStats.mockResolvedValue(wrapped);

    await expect(controller.getResultStats(1)).resolves.toEqual(wrapped);
    expect(service.getResultStats).toHaveBeenCalledWith(1);
  });
});
