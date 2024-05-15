import { TestBed } from '@angular/core/testing';

import { PusherService } from './pusher.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PusherService', () => {
  let service: PusherService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PusherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  describe('validaeFirstUserToEdit', () => {
    it('should identify the first user to edit', () => {
      // Arrange
      const members = {
        '1': { today: '2022-01-01T00:00:00.000Z', roles: ['Admin'], name: 'User 1' },
        '2': { today: '2022-01-02T00:00:00.000Z', roles: ['User'], name: 'User 2' }
      };
      service.presenceChannel = { members: { members, myID: '1' } };

      // Act
      const result = service.validaeFirstUserToEdit();

      // Assert
      expect(result).toBe(true);
      expect(service.firstUser).toBe(true);
      expect(service.secondUser).toBeNull();
      expect(service.membersList.length).toBe(2);
      expect(service.membersList[0].userId).toBe('1');
      expect(service.membersList[1].userId).toBe('2');
    });

    it('should return false if no members are present', () => {
      // Arrange
      service.presenceChannel = { members: null };

      // Act
      const result = service.validaeFirstUserToEdit();

      // Assert
      expect(result).toBe(false);
    });
  });
});
