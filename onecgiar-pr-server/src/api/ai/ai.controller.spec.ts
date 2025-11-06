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
    createSession: jest.Mock;
    closeSession: jest.Mock;
    createProposals: jest.Mock;
    getProposals: jest.Mock;
    createEvent: jest.Mock;
    saveChanges: jest.Mock;
    getResultState: jest.Mock;
    getResultStats: jest.Mock;
  };

  let user = {
    id: 1,
    username: 'testuser',
    email: 'testuser@example.com',
    first_name: 'Test',
    last_name: 'User',
  };

  beforeEach(async () => {
    service = {
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

  it('creates a session', async () => {
    const dto = { result_id: 1, user_id: 2 };
    const expected = { id: 10 };
    service.createSession.mockResolvedValue(expected);

    await expect(controller.createSession(dto, user)).resolves.toEqual(
      expected,
    );
    expect(service.createSession).toHaveBeenCalledWith(dto, user);
  });

  it('closes a session', async () => {
    const expected = { id: 1, closed_at: new Date() };
    service.closeSession.mockResolvedValue(expected);

    await expect(controller.closeSession(1, user)).resolves.toEqual(expected);
    expect(service.closeSession).toHaveBeenCalledWith(1, user);
  });

  it('stores proposals for a session', async () => {
    const dto = { proposals: [] };
    const expected = [{ id: 1 }];
    service.createProposals.mockResolvedValue(expected);

    await expect(controller.createProposals(5, dto)).resolves.toEqual(expected);
    expect(service.createProposals).toHaveBeenCalledWith(5, dto);
  });

  it('retrieves proposals', async () => {
    const expected = [{ id: 1 }];
    service.getProposals.mockResolvedValue(expected);

    await expect(controller.getProposals(7)).resolves.toEqual(expected);
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
    service.createEvent.mockResolvedValue(expected);

    await expect(controller.createEvent(dto, user)).resolves.toEqual(expected);
    expect(service.createEvent).toHaveBeenCalledWith(dto, user);
  });

  it('saves final changes', async () => {
    const dto = { fields: [], user_id: 1 };
    service.saveChanges.mockResolvedValue(undefined);

    await controller.saveChanges(3, dto, user);

    expect(service.saveChanges).toHaveBeenCalledWith(3, dto, user);
  });

  it('returns AI state for a result', async () => {
    const expected = { result_id: 1, fields: [] };
    service.getResultState.mockResolvedValue(expected);

    await expect(controller.getResultState(1)).resolves.toEqual(expected);
    expect(service.getResultState).toHaveBeenCalledWith(1);
  });

  it('returns stats for a result', async () => {
    const expected = { result_id: 1, total_sessions: 0 };
    service.getResultStats.mockResolvedValue(expected);

    await expect(controller.getResultStats(1)).resolves.toEqual(expected);
    expect(service.getResultStats).toHaveBeenCalledWith(1);
  });
});
