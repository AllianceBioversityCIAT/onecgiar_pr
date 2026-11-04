// @akili-spec changes/portfolio-overview-feedback-round/contribution-requests-by-pa (CRP-T-3)
import {
  ContributionRequestCounts,
  ContributionRequestsByProgram,
  PendingContributionRequest
} from '../../../../../../shared/interfaces/portfolio-contribution-requests.interface';
import { daysWaiting, filterByPrograms, formatRequestedDate, pendingFor, pendingForPrograms, sortPendingOldestFirst, sortRows } from './contribution-requests.format';

const counts = (pending = 0, accepted = 0, declined = 0): ContributionRequestCounts => ({ pending, accepted, declined });
const row = (code: string, receivedPending: number, sentPending = 0): ContributionRequestsByProgram => ({
  initiativeId: 1,
  code,
  shortName: code,
  received: counts(receivedPending),
  sent: counts(sentPending)
});
const req = (requestId: number, requesterCode: string | null, approvingCode: string | null, requestedDate: string | null): PendingContributionRequest => ({
  requestId,
  resultCode: 1000 + requestId,
  title: `Result ${requestId}`,
  requesterCode,
  approvingCode,
  requestedDate
});

describe('contribution-requests.format (CRP-T-3)', () => {
  describe('sortRows (CRP-R-6)', () => {
    it('orders by received Pending desc, then by code naturally (SP2 before SP10)', () => {
      const sorted = sortRows([row('SP10', 1), row('A1', 0), row('SP02', 3), row('SP2', 1), row('SP01', 3)]);
      expect(sorted.map(r => r.code)).toEqual(['SP01', 'SP02', 'SP2', 'SP10', 'A1']);
    });

    it('sent Pending does not influence the order, and the input is not mutated', () => {
      const input = [row('SP01', 0, 9), row('SP02', 1, 0)];
      expect(sortRows(input).map(r => r.code)).toEqual(['SP02', 'SP01']);
      expect(input.map(r => r.code)).toEqual(['SP01', 'SP02']);
    });
  });

  describe('filterByPrograms (CRP-R-4)', () => {
    const rows = [row('SP01', 0), row('SP05', 2), row('A3', 1)];
    it('keeps only the selected codes', () => {
      expect(filterByPrograms(rows, new Set(['SP05', 'A3'])).map(r => r.code)).toEqual(['SP05', 'A3']);
    });
    it('an empty selection keeps every row', () => {
      expect(filterByPrograms(rows, new Set<string>())).toHaveLength(3);
    });
    it('a selection with no match keeps nothing', () => {
      expect(filterByPrograms(rows, new Set(['SP99']))).toEqual([]);
    });
  });

  describe('pending lists (CRP-R-2)', () => {
    const list = [
      req(1, 'SP01', 'SP05', '2026-10-20T00:00:00.000Z'),
      req(2, 'SP05', 'SP02', '2026-09-01T00:00:00.000Z'),
      req(3, 'SP03', 'SP04', '2026-08-01T00:00:00.000Z'),
      req(4, 'SP05', null, null),
      req(5, null, 'SP05', '2026-09-15T00:00:00.000Z')
    ];

    it('pendingFor SP05 returns requests where SP05 is requester OR approver, oldest first, no-date last', () => {
      expect(pendingFor(list, 'SP05').map(r => r.requestId)).toEqual([2, 5, 1, 4]);
    });

    it('a P/A with no request gets an empty list', () => {
      expect(pendingFor(list, 'SP99')).toEqual([]);
    });

    it('sortPendingOldestFirst orders by date, then request id, without mutating', () => {
      const same = [req(9, 'A', 'B', '2026-01-01T00:00:00.000Z'), req(7, 'A', 'B', '2026-01-01T00:00:00.000Z'), req(8, 'A', 'B', '2025-12-31T00:00:00.000Z')];
      expect(sortPendingOldestFirst(same).map(r => r.requestId)).toEqual([8, 7, 9]);
      expect(same.map(r => r.requestId)).toEqual([9, 7, 8]);
    });

    it('pendingForPrograms keeps requests touching ANY selected P/A; an empty selection keeps all', () => {
      expect(pendingForPrograms(list, new Set(['SP02'])).map(r => r.requestId)).toEqual([2]);
      expect(pendingForPrograms(list, new Set(['SP03', 'SP02'])).map(r => r.requestId)).toEqual([3, 2]);
      expect(pendingForPrograms(list, new Set<string>()).map(r => r.requestId)).toEqual([3, 2, 5, 1, 4]);
    });
  });

  describe('daysWaiting', () => {
    const now = new Date('2026-11-04T12:00:00.000Z');
    it('counts whole days against a fixed now', () => {
      expect(daysWaiting('2026-11-01T12:00:00.000Z', now)).toBe(3);
      expect(daysWaiting('2026-11-02T12:00:01.000Z', now)).toBe(1);
      expect(daysWaiting('2026-11-04T08:00:00.000Z', now)).toBe(0);
    });
    it('never goes negative for a future date', () => {
      expect(daysWaiting('2026-12-01T00:00:00.000Z', now)).toBe(0);
    });
    it('tolerates null, undefined, empty and unreadable dates', () => {
      expect(daysWaiting(null, now)).toBeNull();
      expect(daysWaiting(undefined, now)).toBeNull();
      expect(daysWaiting('', now)).toBeNull();
      expect(daysWaiting('not a date', now)).toBeNull();
    });
  });

  describe('formatRequestedDate', () => {
    it('gives the UTC calendar day, and null when there is none', () => {
      expect(formatRequestedDate('2026-10-20T23:30:00.000Z')).toBe('2026-10-20');
      expect(formatRequestedDate(null)).toBeNull();
      expect(formatRequestedDate('garbage')).toBeNull();
    });
  });
});
