import { buildUnifiedList } from './build-unified-list';

describe('buildUnifiedList', () => {
  it('classifies exactly the pending Received rows as needsDecision:true (NOTIF-T-1 Falsifier)', () => {
    // Fixture per the task's Falsifier: 2 pending Received, 1 resolved Received, 1 Sent, 2 Updates.
    const pendingReceived1 = { request_status_id: 1, requested_date: '2026-09-29T09:00:00Z' };
    const pendingReceived2 = { request_status_id: 1, requested_date: '2026-09-28T09:00:00Z' };
    const resolvedReceived = { request_status_id: 2, requested_date: '2026-09-27T09:00:00Z' };

    const sentRow = { request_status_id: 1, requested_date: '2026-09-26T09:00:00Z' };

    const updateRow1 = { notification_id: 1, created_date: '2026-09-25T09:00:00Z' };
    const updateRow2 = { notification_id: 2, created_date: '2026-09-24T09:00:00Z' };

    const result = buildUnifiedList([pendingReceived1, pendingReceived2, resolvedReceived], [sentRow], [updateRow1, updateRow2]);

    expect(result).toHaveLength(6);
    expect(result.filter(row => row.needsDecision === true)).toHaveLength(2);
    expect(result.filter(row => row.needsDecision === false)).toHaveLength(4);
  });

  it('tags every Received/Sent row with source:"request" and every Updates row with source:"update"', () => {
    const received = [{ request_status_id: 1 }];
    const sent = [{ request_status_id: 1 }];
    const updates = [{ notification_id: 1 }];

    const result = buildUnifiedList(received, sent, updates);

    expect(result[0].source).toBe('request');
    expect(result[1].source).toBe('request');
    expect(result[2].source).toBe('update');
  });

  it('classifies a Sent row as needsDecision:false even when its request_status_id is 1 (isSent overrides status)', () => {
    const sentPendingLooking = { request_status_id: 1, requested_date: '2026-09-29T09:00:00Z' };

    const result = buildUnifiedList([], [sentPendingLooking], []);

    expect(result[0]).toMatchObject({ source: 'request', needsDecision: false });
  });

  it('classifies every Updates row as needsDecision:false regardless of any request_status_id-like field', () => {
    const updateRow = { notification_id: 1, created_date: '2026-09-29T09:00:00Z' };

    const result = buildUnifiedList([], [], [updateRow]);

    expect(result[0]).toMatchObject({ source: 'update', needsDecision: false });
  });

  it('normalizes activityDate from requested_date for Requests-tab rows (Received and Sent)', () => {
    const received = [{ request_status_id: 2, requested_date: '2026-09-20T00:00:00Z' }];
    const sent = [{ request_status_id: 2, requested_date: '2026-09-21T00:00:00Z' }];

    const result = buildUnifiedList(received, sent, []);

    expect(result[0].activityDate).toBe('2026-09-20T00:00:00Z');
    expect(result[1].activityDate).toBe('2026-09-21T00:00:00Z');
  });

  it('normalizes activityDate from created_date for Updates-tab rows', () => {
    const updateRow = { notification_id: 1, created_date: '2026-09-22T00:00:00Z' };

    const result = buildUnifiedList([], [], [updateRow]);

    expect(result[0].activityDate).toBe('2026-09-22T00:00:00Z');
  });

  it('preserves all original fields on each row (additive tagging, not a reshape)', () => {
    const received = [{ request_status_id: 1, requested_date: '2026-09-29T00:00:00Z', obj_result: { result_code: 'R-1' } }];

    const result = buildUnifiedList(received, [], []);

    expect(result[0]).toMatchObject({
      request_status_id: 1,
      requested_date: '2026-09-29T00:00:00Z',
      obj_result: { result_code: 'R-1' }
    });
  });

  it('returns an empty array when all three sources are empty or omitted', () => {
    expect(buildUnifiedList([], [], [])).toEqual([]);
    expect(buildUnifiedList()).toEqual([]);
  });

  it('tolerates null/undefined sources, treating them as empty', () => {
    const result = buildUnifiedList(undefined, null as unknown as undefined, undefined);

    expect(result).toEqual([]);
  });

  // NOTIF-T-6 (Pivot re-scope, NOTIF-DD-6): a true Received-vs-Sent discriminator. `source` alone
  // cannot tell a resolved Received row (source:'request', needsDecision:false) apart from a Sent
  // row (also source:'request', needsDecision:false) — the in-list Received/Sent toggle needs the
  // real origin each row came from, not the needsDecision-based proxy `isSentRow()` used until now.
  it('tags every row with its real origin — "received" / "sent" / "update" — independent of needsDecision', () => {
    const pendingReceived = { request_status_id: 1 };
    const resolvedReceived = { request_status_id: 2 };
    const sentRow = { request_status_id: 1 };
    const updateRow = { notification_id: 1 };

    const result = buildUnifiedList([pendingReceived, resolvedReceived], [sentRow], [updateRow]);

    expect(result[0].origin).toBe('received');
    expect(result[1].origin).toBe('received');
    expect(result[2].origin).toBe('sent');
    expect(result[3].origin).toBe('update');
  });

  it('origin distinguishes a resolved Received row from a Sent row even though both are needsDecision:false', () => {
    const resolvedReceived = { request_status_id: 2 };
    const sentRow = { request_status_id: 2 };

    const result = buildUnifiedList([resolvedReceived], [sentRow], []);

    expect(result[0]).toMatchObject({ origin: 'received', needsDecision: false });
    expect(result[1]).toMatchObject({ origin: 'sent', needsDecision: false });
  });
});
