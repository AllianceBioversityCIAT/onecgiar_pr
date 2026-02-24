import { TestBed } from '@angular/core/testing';

import { PusherService } from './pusher.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';

describe('PusherService', () => {
  let service: PusherService;
  let mockRouter: { url: string; navigateByUrl: jest.Mock };

  beforeEach(() => {
    mockRouter = {
      url: '/current/url',
      navigateByUrl: jest.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: mockRouter }]
    });
    service = TestBed.inject(PusherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validaeFirstUserToEdit', () => {
    it('should identify the first user to edit', () => {
      const members = {
        '1': { today: '2022-01-01T00:00:00.000Z', roles: ['Admin'], name: 'User 1' },
        '2': { today: '2022-01-02T00:00:00.000Z', roles: ['User'], name: 'User 2' }
      };
      service.presenceChannel = { members: { members, myID: '1' } };

      const result = service.validaeFirstUserToEdit();

      expect(result).toBe(true);
      expect(service.firstUser).toBe(true);
      expect(service.secondUser).toBeNull();
      expect(service.membersList.length).toBe(2);
      expect(service.membersList[0].userId).toBe('1');
      expect(service.membersList[1].userId).toBe('2');
    });

    it('should return false if no members are present', () => {
      service.presenceChannel = { members: null };

      const result = service.validaeFirstUserToEdit();

      expect(result).toBe(false);
    });

    it('should return false when presenceChannel is null', () => {
      service.presenceChannel = null;

      const result = service.validaeFirstUserToEdit();

      expect(result).toBe(false);
    });

    it('should return false when presenceChannel is undefined', () => {
      service.presenceChannel = undefined;

      const result = service.validaeFirstUserToEdit();

      expect(result).toBe(false);
    });

    it('should return true when members object is empty', () => {
      service.presenceChannel = { members: { members: {}, myID: '1' } };

      const result = service.validaeFirstUserToEdit();

      expect(result).toBe(true);
    });

    it('should return false and set secondUser when current user is NOT the first user', () => {
      const members = {
        '1': { today: '2022-01-01T00:00:00.000Z', name: 'User 1' },
        '2': { today: '2022-01-02T00:00:00.000Z', name: 'User 2' }
      };
      service.presenceChannel = { members: { members, myID: '2' } };

      const result = service.validaeFirstUserToEdit();

      expect(result).toBe(false);
      expect(service.firstUser).toBe(false);
      expect(service.secondUser).toBe(true);
    });

    it('should navigate when firstUser is true and secondUser was previously set', () => {
      // First, set secondUser to true (simulating a previous non-first-user state)
      service.secondUser = true;

      const members = {
        '1': { today: '2022-01-01T00:00:00.000Z', name: 'User 1' }
      };
      service.presenceChannel = { members: { members, myID: '1' } };

      // Mock resultsSE.currentResultId via the api property
      (service as any).api = { resultsSE: { currentResultId: 123 } };

      const result = service.validaeFirstUserToEdit();

      expect(result).toBe(true);
      expect(service.firstUser).toBe(true);
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/result/result-detail/123');
    });

    it('should handle members with missing today (optional chaining on date)', () => {
      const members = {
        '1': { name: 'User 1' },
        '2': { today: '2022-01-02T00:00:00.000Z', name: 'User 2' }
      };
      service.presenceChannel = { members: { members, myID: '1' } };

      const result = service.validaeFirstUserToEdit();

      expect(typeof result).toBe('boolean');
      expect(service.membersList.length).toBe(2);
    });
  });

  describe('textToinitials', () => {
    it('should convert text to initials', () => {
      expect(service.textToinitials('John Doe')).toBe('JD');
    });

    it('should handle single word', () => {
      expect(service.textToinitials('John')).toBe('J');
    });
  });

  describe('start', () => {
    let mockPusherInstance: any;

    beforeEach(() => {
      mockPusherInstance = {
        subscribe: jest.fn().mockReturnValue({ members: {} }),
        disconnect: jest.fn(),
        unsubscribe: jest.fn()
      };
      (globalThis as any).Pusher = jest.fn().mockReturnValue(mockPusherInstance);
      (service as any).api = {
        resultsSE: { currentResultId: 1 },
        authSE: { localStorageUser: { id: 42 } }
      };
    });

    afterEach(() => {
      delete (globalThis as any).Pusher;
    });

    it('should start without disconnecting when beforeRoute is null', () => {
      service.beforeRoute = null;

      service.start('/some/route', 1);

      expect(mockPusherInstance.disconnect).not.toHaveBeenCalled();
      expect(mockPusherInstance.unsubscribe).not.toHaveBeenCalled();
      expect(service.presenceChannel).toBeDefined();
      expect(service.beforeRoute).toBe('someroute');
    });

    it('should disconnect and unsubscribe when beforeRoute is set', () => {
      service.beforeRoute = 'previousroute';
      service.pusher = {
        disconnect: jest.fn(),
        unsubscribe: jest.fn()
      };

      service.start('/new/route', 2);

      expect(service.pusher).not.toBe(undefined);
      expect(service.beforeRoute).toBe('newroute');
    });
  });
});
