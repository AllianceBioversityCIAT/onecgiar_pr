import {
  NotificationType,
  buildResultNotificationText,
  getAiJobNotificationParts,
  getNotificationActionVerb,
  getRejectionReasonLine,
  getResultNotificationTextParts,
  isBilateralReviewNotification,
  isBilateralSubmittedNotification,
  isResultTaggedNotification,
  parseCenterReportedProjectText,
  resolveNotificationType
} from './notification-type.constants';

const resultOf = (overrides: any = {}) => ({
  result_code: 4321,
  title: 'A bilateral result title',
  obj_result_by_initiatives: [{ obj_initiative: { id: 5, official_code: 'SP5' } }],
  ...overrides
});

const notificationOf = (type: NotificationType | null, overrides: any = {}) => ({
  ...(type ? { obj_notification_type: { notifications_type_id: 99, type } } : {}),
  obj_emitter_user: { first_name: 'Jane', last_name: 'Doe' },
  obj_result: resultOf(),
  ...overrides
});

describe('notification-type constants', () => {
  describe('Bilateral AI Job Finished (no result behind the row)', () => {
    const aiJob = (text: string | null) => ({
      notification_id: 7,
      result_id: null,
      obj_result: null,
      text,
      obj_notification_type: { notifications_type_id: 13, type: NotificationType.BILATERAL_AI_JOB_FINISHED }
    });
    const SENTENCE = 'AI-assisted processing finished — 2 drafts ready for CIP · 1 PDF · 3 min';

    it('splits the server sentence from its deep link and keeps the path app-relative', () => {
      expect(getAiJobNotificationParts(aiJob(`${SENTENCE} https://reporting.cgiar.org/bilateral/CIP/drafts`))).toEqual({
        message: SENTENCE,
        path: '/bilateral/CIP/drafts'
      });
    });

    it('keeps the query of a failed-job link', () => {
      expect(getAiJobNotificationParts(aiJob('failed for CIP · 2 min https://x.org/bilateral/CIP/create?job=abc'))?.path).toBe(
        '/bilateral/CIP/create?job=abc'
      );
    });

    it('has no path when the text carries no link, and a generic line when it carries no text', () => {
      expect(getAiJobNotificationParts(aiJob(SENTENCE))).toEqual({ message: SENTENCE, path: null });
      expect(getAiJobNotificationParts(aiJob(null))?.message).toBe('Your AI-assisted processing job finished.');
    });

    it('never renders the "The result -" lead-in or the empty result identity', () => {
      const n = aiJob(`${SENTENCE} https://reporting.cgiar.org/bilateral/CIP/drafts`);
      expect(getResultNotificationTextParts(n)).toEqual({ prefix: SENTENCE, suffix: null, emphasizePrefix: false });
      expect(buildResultNotificationText(n)).toBe(SENTENCE);
    });

    it('returns null for any other type', () => {
      expect(getAiJobNotificationParts(notificationOf(NotificationType.RESULT_SUBMITTED))).toBeNull();
    });
  });

  describe('resolveNotificationType', () => {
    it('resolves by name from obj_notification_type', () => {
      expect(resolveNotificationType(notificationOf(NotificationType.RESULT_SUBMITTED))).toBe(
        NotificationType.RESULT_SUBMITTED
      );
    });

    it('falls back to the legacy numeric id when the relation is absent', () => {
      expect(resolveNotificationType({ notification_type: 1 })).toBe(NotificationType.RESULT_SUBMITTED);
      expect(resolveNotificationType({ notification_type: 2 })).toBe(NotificationType.RESULT_UNSUBMITTED);
      expect(resolveNotificationType({ notification_type: 3 })).toBe(NotificationType.RESULT_QUALITY_ASSESSED);
      expect(resolveNotificationType({ notification_type: 5 })).toBe(NotificationType.RESULT_CREATED);
    });

    it('prefers the name over a conflicting legacy id', () => {
      const notification = {
        notification_type: 1,
        obj_notification_type: { type: NotificationType.BILATERAL_RESULT_REJECTED }
      };
      expect(resolveNotificationType(notification)).toBe(NotificationType.BILATERAL_RESULT_REJECTED);
    });

    it('returns null for an unknown type', () => {
      expect(resolveNotificationType({ notification_type: 42 })).toBeNull();
      expect(resolveNotificationType({})).toBeNull();
      expect(resolveNotificationType({ obj_notification_type: { type: 'Something Else' } })).toBeNull();
    });
  });

  describe('getNotificationActionVerb', () => {
    it.each([
      [NotificationType.RESULT_SUBMITTED, 'submitted'],
      [NotificationType.RESULT_UNSUBMITTED, 'unsubmitted'],
      [NotificationType.RESULT_CREATED, 'created'],
      [NotificationType.RESULT_QUALITY_ASSESSED, 'Quality Assessed']
    ])('maps %s to "%s"', (type, verb) => {
      expect(getNotificationActionVerb(notificationOf(type))).toBe(verb);
    });

    it('returns an empty verb for types without an actor phrasing', () => {
      expect(getNotificationActionVerb(notificationOf(NotificationType.BILATERAL_RESULT_APPROVED))).toBe('');
      expect(getNotificationActionVerb({ notification_type: 42 })).toBe('');
    });
  });

  // Regression net: these strings must stay byte-identical to what the four removed switch
  // statements produced, otherwise existing notifications change wording.
  describe('buildResultNotificationText — legacy parity', () => {
    it('keeps the actor phrasing for submitted / unsubmitted / created', () => {
      expect(buildResultNotificationText(notificationOf(NotificationType.RESULT_SUBMITTED))).toBe(
        'Jane Doe has submitted the result 4321 - A bilateral result title'
      );
      expect(buildResultNotificationText(notificationOf(NotificationType.RESULT_UNSUBMITTED))).toBe(
        'Jane Doe has unsubmitted the result 4321 - A bilateral result title'
      );
      expect(buildResultNotificationText(notificationOf(NotificationType.RESULT_CREATED))).toBe(
        'Jane Doe has created the result 4321 - A bilateral result title'
      );
    });

    it('keeps the quality-assessed sentence', () => {
      expect(buildResultNotificationText(notificationOf(NotificationType.RESULT_QUALITY_ASSESSED))).toBe(
        'The result 4321 - A bilateral result title was successfully Quality Assessed.'
      );
    });

    it('works off the legacy numeric ids too', () => {
      expect(
        buildResultNotificationText({
          notification_type: 1,
          obj_emitter_user: { first_name: 'Jane', last_name: 'Doe' },
          obj_result: resultOf()
        })
      ).toBe('Jane Doe has submitted the result 4321 - A bilateral result title');
    });

    it('falls back to a neutral lead-in for an unknown type instead of claiming a QA', () => {
      const text = buildResultNotificationText({ notification_type: 42, obj_result: resultOf() });
      expect(text).toBe('The result 4321 - A bilateral result title');
      expect(text).not.toContain('Quality Assessed');
    });

    it('falls back to "A user" when the emitter has no name', () => {
      expect(
        buildResultNotificationText(notificationOf(NotificationType.RESULT_SUBMITTED, { obj_emitter_user: {} }))
      ).toBe('A user has submitted the result 4321 - A bilateral result title');
    });
  });

  // P2-3157 AC2
  describe('buildResultNotificationText — bilateral review decisions', () => {
    it('builds the approved copy', () => {
      expect(buildResultNotificationText(notificationOf(NotificationType.BILATERAL_RESULT_APPROVED))).toBe(
        '✅ Your Result 4321 - A bilateral result title has been Approved by the Science Program SP5.'
      );
    });

    it('builds the rejected copy', () => {
      expect(buildResultNotificationText(notificationOf(NotificationType.BILATERAL_RESULT_REJECTED))).toBe(
        '❌ Your Result 4321 - A bilateral result title has been Rejected by the Science Program SP5.'
      );
    });

    it('omits the program code when no owner initiative is present', () => {
      const notification = notificationOf(NotificationType.BILATERAL_RESULT_APPROVED, {
        obj_result: resultOf({ obj_result_by_initiatives: [] })
      });
      expect(buildResultNotificationText(notification)).toBe(
        '✅ Your Result 4321 - A bilateral result title has been Approved by the Science Program.'
      );
    });
  });

  // NDCW-R-1 / R-2 / R-5: center wording when `text` is present, attached comma.
  describe('bilateral review decisions — center wording (NDCW)', () => {
    const centerText = (verb: string) => `where your center was tagged, has been ${verb} by the Science Program SP03.`;
    const withText = (type: NotificationType, text: string | null) =>
      notificationOf(type, {
        text,
        obj_result: resultOf({ result_code: 9561, title: 'T', obj_result_by_initiatives: [] })
      });

    it.each([
      [NotificationType.BILATERAL_RESULT_APPROVED, 'approved'],
      [NotificationType.BILATERAL_RESULT_REJECTED, 'rejected']
    ])('flattens %s with the comma attached to the title', (type, verb) => {
      const flat = buildResultNotificationText(withText(type, centerText(verb)));
      expect(flat).toBe(`The result 9561 - T, ${centerText(verb)}`);
      expect(flat).not.toContain('T ,');
      expect(flat).not.toContain('Your Result');
    });

    it('exposes the comma as linkTrailer and a non-emphasised prefix', () => {
      const parts = getResultNotificationTextParts(withText(NotificationType.BILATERAL_RESULT_APPROVED, centerText('approved')));
      expect(parts).toEqual({
        prefix: 'The result',
        linkTrailer: ',',
        suffix: centerText('approved'),
        emphasizePrefix: false
      });
    });

    it.each([null, '', '   '])('keeps "Your Result" when text is %p', text => {
      const notification = notificationOf(NotificationType.BILATERAL_RESULT_APPROVED, {
        text,
        obj_result: resultOf({ result_code: 9561, title: 'T', obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP03' } }] })
      });
      expect(buildResultNotificationText(notification)).toBe(
        '✅ Your Result 9561 - T has been Approved by the Science Program SP03.'
      );
      expect(getResultNotificationTextParts(notification).linkTrailer).toBeUndefined();
    });

    it('keeps "Your Result" for Rejected without text', () => {
      const notification = notificationOf(NotificationType.BILATERAL_RESULT_REJECTED, {
        text: null,
        obj_result: resultOf({ result_code: 9561, title: 'T', obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP03' } }] })
      });
      expect(buildResultNotificationText(notification)).toBe(
        '❌ Your Result 9561 - T has been Rejected by the Science Program SP03.'
      );
    });
  });

  // SACN-T-3 (`notifications/sp-approval-center-notice`, SACN-R-3/R-4/R-5/R-7): new-shape center
  // sentence for Approve, rendered as bold-SP-code + plain-verb segments.
  describe('bilateral review decisions — approved center notice (SACN)', () => {
    const withText = (type: NotificationType, text: string | null) =>
      notificationOf(type, {
        text,
        obj_result: resultOf({ result_code: 9330, title: 'Solar-powered cold storage adoption in Kenyan markets' })
      });

    it('builds the exact SP-code sentence and bolds only the SP code', () => {
      const notification = withText(
        NotificationType.BILATERAL_RESULT_APPROVED,
        "SP06, as primary Science Program, has approved your center's result"
      );

      expect(buildResultNotificationText(notification)).toBe(
        "SP06, as primary Science Program, has approved your center's result 9330 - Solar-powered cold storage adoption in Kenyan markets"
      );

      const parts = getResultNotificationTextParts(notification);
      expect(parts.segments).toEqual([
        { text: 'SP06', emphasize: true },
        { text: ", as primary Science Program, has approved your center's result", emphasize: false }
      ]);
      expect(parts.linkTrailer).toBeUndefined();
    });

    it('falls back to the no-code sentence with no emphasized segment', () => {
      const notification = withText(
        NotificationType.BILATERAL_RESULT_APPROVED,
        "The primary Science Program has approved your center's result"
      );

      expect(buildResultNotificationText(notification)).toBe(
        "The primary Science Program has approved your center's result 9330 - Solar-powered cold storage adoption in Kenyan markets"
      );

      const parts = getResultNotificationTextParts(notification);
      expect(parts.segments).toEqual([
        { text: "The primary Science Program has approved your center's result", emphasize: false }
      ]);
      expect(parts.segments?.some(segment => segment.emphasize)).toBe(false);
    });

    it('never applies the new-shape parser to Rejected, even with the same tail', () => {
      const notification = withText(
        NotificationType.BILATERAL_RESULT_REJECTED,
        "SP06, as primary Science Program, has approved your center's result"
      );

      const parts = getResultNotificationTextParts(notification);
      expect(parts.segments).toBeUndefined();
      expect(parts.prefix).toBe('The result');
      expect(parts.suffix).toBe("SP06, as primary Science Program, has approved your center's result");
    });

    it('keeps legacy center wording and the submitter/empty-text cases unchanged (SACN-R-7)', () => {
      const legacy = withText(
        NotificationType.BILATERAL_RESULT_APPROVED,
        'where your center was tagged, has been approved by the Science Program SP03.'
      );
      expect(getResultNotificationTextParts(legacy).segments).toBeUndefined();
      expect(buildResultNotificationText(legacy)).toBe(
        "The result 9330 - Solar-powered cold storage adoption in Kenyan markets, where your center was tagged, has been approved by the Science Program SP03."
      );

      const empty = withText(NotificationType.BILATERAL_RESULT_APPROVED, null);
      expect(getResultNotificationTextParts(empty).segments).toBeUndefined();
      expect(buildResultNotificationText(empty)).toBe(
        '✅ Your Result 9330 - Solar-powered cold storage adoption in Kenyan markets has been Approved by the Science Program SP5.'
      );
    });
  });

  describe('getResultNotificationTextParts', () => {
    it('emphasises the actor phrase but not the bare lead-in', () => {
      expect(getResultNotificationTextParts(notificationOf(NotificationType.RESULT_SUBMITTED)).emphasizePrefix).toBe(
        true
      );
      expect(
        getResultNotificationTextParts(notificationOf(NotificationType.RESULT_QUALITY_ASSESSED)).emphasizePrefix
      ).toBe(false);
    });

    it('splits the bilateral copy around the result link', () => {
      const parts = getResultNotificationTextParts(notificationOf(NotificationType.BILATERAL_RESULT_REJECTED));
      expect(parts.prefix).toBe('❌ Your Result');
      expect(parts.suffix).toBe('has been Rejected by the Science Program SP5.');
    });
  });

  // P2-3214 AC3. The variable half of this sentence names the tagged centre or project, which the
  // server composes at emit time and ships on `notification.text` — a result carries several
  // centres, so it cannot be derived on read.
  describe('tagged centre / bilateral project (P2-3214)', () => {
    const TAGGED_SUFFIX = 'created by SP04 has tagged the Africa Rice Center. Click to see the result.';

    it('composes the full AC3 sentence from the stored suffix', () => {
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, { text: TAGGED_SUFFIX });

      expect(buildResultNotificationText(notification)).toBe(
        `The result 4321 - A bilateral result title ${TAGGED_SUFFIX}`
      );
    });

    it('trims the stored suffix and does not emphasize the lead-in', () => {
      const parts = getResultNotificationTextParts(
        notificationOf(NotificationType.RESULT_CENTER_TAGGED, { text: `  ${TAGGED_SUFFIX}  ` })
      );

      expect(parts.prefix).toBe('The result');
      expect(parts.suffix).toBe(TAGGED_SUFFIX);
      expect(parts.emphasizePrefix).toBe(false);
    });

    it('renders the identity alone rather than half a sentence when text is missing', () => {
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, { text: '   ' });
      const parts = getResultNotificationTextParts(notification);

      expect(parts.suffix).toBeNull();
      expect(buildResultNotificationText(notification)).toBe('The result 4321 - A bilateral result title');
    });
  });

  // WCT-T-4 (`w1w2-center-tagged`): the server now stores the bare tagged Center's acronym on
  // `notification.text` for direct-tag rows (W1/W2, IPSR, SP review of a bilateral result) — the
  // client builds the full sentence, naming the owner Science Program as `lead`, unlike legacy/BCT
  // composed rows above (which keep the server-composed suffix, WCT-R-7).
  describe('direct-tag Center row (WCT-T-4)', () => {
    it('builds the bare-shape parts with the owner SP as lead', () => {
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, {
        text: 'ABC',
        obj_result: resultOf({ obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP01' } }] })
      });

      const parts = getResultNotificationTextParts(notification);

      expect(parts).toEqual({
        lead: 'SP01',
        prefix: 'has tagged your CG Center as a contributor (ABC) to result',
        suffix: null,
        emphasizePrefix: false
      });
    });

    // WCT-R-5: the flattened plain-text form (bell link `search=`, the search-filter pipe) must
    // carry the same sentence as the split-parts rendering, lead included.
    it('flattens the bare shape with the lead first, matching the row sentence exactly', () => {
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, {
        text: 'ABC',
        obj_result: resultOf({
          result_code: 9398,
          title: '<title>',
          obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP01' } }]
        })
      });

      expect(buildResultNotificationText(notification)).toBe(
        'SP01 has tagged your CG Center as a contributor (ABC) to result 9398 - <title>'
      );
    });

    it('never lets the bare prefix carry forbidden legacy/BCT phrases', () => {
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, {
        text: 'ABC',
        obj_result: resultOf({ obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP01' } }] })
      });

      const parts = getResultNotificationTextParts(notification);

      expect(parts.prefix).not.toContain('The result');
      expect(parts.prefix).not.toContain('created by');
      expect(parts.prefix).not.toContain('Click to see the result.');
    });

    it('falls back the lead to "a Science Program" when no owner SP is available', () => {
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, {
        text: 'ABC',
        obj_result: resultOf({ obj_result_by_initiatives: [] })
      });

      expect(getResultNotificationTextParts(notification).lead).toBe('a Science Program');
    });

    it('still falls back to the legacy rendering for a BCT-composed sentence', () => {
      const bctText = 'reported by AfricaRice has tagged the CIP. Click to see the result.';
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, { text: bctText });

      expect(getResultNotificationTextParts(notification)).toEqual({
        prefix: 'The result',
        suffix: bctText,
        emphasizePrefix: false
      });
    });

    it('still falls back to the legacy rendering for the SP01-created-by composed sentence', () => {
      const composedText = 'created by SP01 has tagged the X. Click to see the result.';
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, { text: composedText });

      expect(getResultNotificationTextParts(notification)).toEqual({
        prefix: 'The result',
        suffix: composedText,
        emphasizePrefix: false
      });
    });

    it('still falls back to the legacy rendering for empty or null text', () => {
      const emptyNotification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, { text: '' });
      const nullNotification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, { text: null });

      for (const notification of [emptyNotification, nullNotification]) {
        expect(getResultNotificationTextParts(notification)).toEqual({
          prefix: 'The result',
          suffix: null,
          emphasizePrefix: false
        });
      }
    });
  });

  // WPT-T-3 (`w1w2-project-tagged`, amends NOTIF-T-12): the server now stores
  // `"<project code> (<Center label>)"` on `notification.text` for an enriched bare row (WPT-R-1),
  // or just the bare project code for a legacy bare row (WPT-R-3, no trailing `(…)`) — the client
  // builds the full sentence either way, naming the emitter and Science Program itself, unlike
  // `RESULT_CENTER_TAGGED` above (which keeps the server-composed suffix).
  describe('tagged bilateral project text (WPT-T-3)', () => {
    it('builds the full sentence for a legacy bare row (no Center label)', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'P-1568-WBS0'
      });

      expect(buildResultNotificationText(notification)).toBe(
        'Jane Doe from SP5 has tagged the bilateral project P-1568-WBS0 from your center to result 4321 - A bilateral result title'
      );

      const parts = getResultNotificationTextParts(notification);
      expect(parts.segments?.filter(s => s.emphasize).map(s => s.text)).toEqual(['SP5', 'P-1568-WBS0']);
    });

    it('falls back to "a Science Program" when no program code is available', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'P-1568-WBS0',
        obj_result: resultOf({ obj_result_by_initiatives: [] })
      });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.prefix).toContain('from a Science Program has tagged the bilateral project P-1568-WBS0 from your center to result');
      expect(parts.suffix).toBeNull();
      expect(parts.emphasizePrefix).toBe(false);
      expect(parts.segments?.filter(s => s.emphasize).map(s => s.text)).toEqual(['a Science Program', 'P-1568-WBS0']);
    });

    it('falls back to "A user" when no emitter name is available', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'P-1568-WBS0',
        obj_emitter_user: null
      });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.prefix).toContain('A user from SP5 has tagged the bilateral project P-1568-WBS0');
    });

    it('builds the enriched mockup sentence, with SP code, project code and Center label each emphasized', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'B-A1080 (ABC)',
        obj_emitter_user: { first_name: 'Lucia', last_name: 'Ferrari' },
        obj_result: resultOf({
          result_code: 9341,
          title: '<title>',
          obj_result_by_initiatives: [{ obj_initiative: { id: 9, official_code: 'SP09' } }]
        })
      });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.segments?.filter(s => s.emphasize).map(s => s.text)).toEqual(['SP09', 'B-A1080', 'ABC']);
      expect(buildResultNotificationText(notification)).toBe(
        'Lucia Ferrari from SP09 has tagged the bilateral project B-A1080 from your center (ABC) to result 9341 - <title>'
      );
      expect(parts.suffix).toBeNull();
      expect(parts.emphasizePrefix).toBe(false);
    });

    it('treats only the last trailing "(...)" as the Center label, when the project code itself contains parentheses', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'Seeds (Phase 2) project (ABC)'
      });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.segments?.filter(s => s.emphasize).map(s => s.text)).toEqual(['SP5', 'Seeds (Phase 2) project', 'ABC']);
      expect(parts.prefix).toContain('has tagged the bilateral project Seeds (Phase 2) project from your center (ABC) to result');
    });

    // Rework attempt 2 (Reviewer FAIL issue 1): `notification.text` isn't always a bare project
    // label — it can also be a BCT-T-4 submission-flow sentence, a pre-fix legacy sentence, or
    // empty. All four shapes must render correctly, never garbled and never "undefined".
    it('falls back to the old rendering for a BCT-T-4 submission-flow composed sentence', () => {
      const bctText = 'reported by AR has tagged the P-CIP of your center (CIP). Click to see the result.';
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, { text: bctText });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.prefix).toBe('The result');
      expect(parts.suffix).toBe(bctText);
      expect(parts.emphasizePrefix).toBe(false);
      expect(buildResultNotificationText(notification)).toBe(`The result 4321 - A bilateral result title ${bctText}`);
    });

    it('falls back to the old rendering for a legacy (pre-fix) composed sentence', () => {
      const legacyText = 'created by SP04 has tagged the P-1568-WBS0. Click to see the result.';
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, { text: legacyText });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.prefix).toBe('The result');
      expect(parts.suffix).toBe(legacyText);
      expect(parts.emphasizePrefix).toBe(false);
    });

    it('falls back to the old rendering (no "undefined") when text is empty or null', () => {
      const emptyNotification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, { text: '' });
      const nullNotification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, { text: null });
      const whitespaceNotification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: '   '
      });

      for (const notification of [emptyNotification, nullNotification, whitespaceNotification]) {
        const parts = getResultNotificationTextParts(notification);
        expect(parts.prefix).toBe('The result');
        expect(parts.suffix).toBeNull();
        const rendered = buildResultNotificationText(notification);
        expect(rendered).not.toContain('undefined');
        expect(rendered).toBe('The result 4321 - A bilateral result title');
      }
    });

    it('still builds the full sentence for a genuine bare project label', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, { text: 'P-1568-WBS0' });

      expect(buildResultNotificationText(notification)).toBe(
        'Jane Doe from SP5 has tagged the bilateral project P-1568-WBS0 from your center to result 4321 - A bilateral result title'
      );
    });

    it('falsifier: a BCT-composed row never sets segments', () => {
      const bctText = 'reported by AR has tagged the P-CIP of your center (CIP). Click to see the result.';
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, { text: bctText });

      expect(getResultNotificationTextParts(notification).segments).toBeUndefined();
    });

    it('falsifier: another tagged type (RESULT_CENTER_TAGGED) never sets segments', () => {
      const notification = notificationOf(NotificationType.RESULT_CENTER_TAGGED, { text: 'ABC' });

      expect(getResultNotificationTextParts(notification).segments).toBeUndefined();
    });
  });

  describe('Center-reported bilateral project tagged (BPT-T-3)', () => {
    // design.md §9 shape table, pinned identically on the server twin.
    it.each([
      ['ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)', { reporter: 'ICRISAT', code: 'B-A1187', owner: 'ABC' }],
      [
        'A CGIAR Center has tagged the bilateral project B-A1187 from your center (ABC)',
        { reporter: 'A CGIAR Center', code: 'B-A1187', owner: 'ABC' }
      ],
      [
        'ICRISAT has tagged the bilateral project Seeds (Phase 2) from your center (ABC)',
        { reporter: 'ICRISAT', code: 'Seeds (Phase 2)', owner: 'ABC' }
      ],
      ['reported by AR has tagged the P-CIP of your center (CIP). Click to see the result.', null],
      ['B-A1080 (ABC)', null],
      ['B-A1080', null],
      ['', null],
      ['ICRISAT has tagged the bilateral project B-A1187 from your center ()', null]
    ])('parses %s', (text, expected) => {
      expect(parseCenterReportedProjectText(text)).toEqual(expected);
    });

    it('flattens to the full sentence with the result identity appended', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)',
        obj_result: resultOf({ result_code: 9322, title: '<title>' })
      });

      expect(buildResultNotificationText(notification)).toBe(
        'ICRISAT has tagged the bilateral project B-A1187 from your center (ABC) to result 9322 - <title>'
      );
    });

    it('emphasizes exactly reporter, code and owner — never "The result"', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)'
      });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.segments?.filter(s => s.emphasize).map(s => s.text)).toEqual(['ICRISAT', 'B-A1187', 'ABC']);
      expect(parts.prefix).not.toContain('The result');
      expect(parts.suffix).toBeNull();
      expect(parts.emphasizePrefix).toBe(false);
    });

    it('keeps the project code intact when it contains its own parentheses', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'ICRISAT has tagged the bilateral project Seeds (Phase 2) from your center (ABC)'
      });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.segments?.filter(s => s.emphasize).map(s => s.text)).toEqual(['ICRISAT', 'Seeds (Phase 2)', 'ABC']);
    });

    it('never falls into the composed-sentence fallback (order falsifier)', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'ICRISAT has tagged the bilateral project B-A1187 from your center (ABC)'
      });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.prefix).not.toBe('The result');
      expect(parts.segments).toBeDefined();
    });
  });

  describe('isResultTaggedNotification', () => {
    it('is true only for the two tagged types', () => {
      expect(isResultTaggedNotification(notificationOf(NotificationType.RESULT_CENTER_TAGGED))).toBe(true);
      expect(isResultTaggedNotification(notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED))).toBe(true);
      expect(isResultTaggedNotification(notificationOf(NotificationType.BILATERAL_RESULT_APPROVED))).toBe(false);
      expect(isResultTaggedNotification({})).toBe(false);
    });
  });

  describe('isBilateralReviewNotification', () => {
    it('is true only for the two review-decision types', () => {
      expect(isBilateralReviewNotification(notificationOf(NotificationType.BILATERAL_RESULT_APPROVED))).toBe(true);
      expect(isBilateralReviewNotification(notificationOf(NotificationType.BILATERAL_RESULT_REJECTED))).toBe(true);
      expect(isBilateralReviewNotification(notificationOf(NotificationType.RESULT_SUBMITTED))).toBe(false);
      expect(isBilateralReviewNotification({})).toBe(false);
    });
  });

  // 2026-09-05 — the arrival announcement to the primary SP.
  describe('bilateral submitted for review', () => {
    it('isBilateralSubmittedNotification is true only for the submitted type', () => {
      expect(isBilateralSubmittedNotification(notificationOf(NotificationType.BILATERAL_RESULT_SUBMITTED))).toBe(true);
      expect(isBilateralSubmittedNotification(notificationOf(NotificationType.BILATERAL_RESULT_APPROVED))).toBe(false);
      expect(isBilateralSubmittedNotification(notificationOf(NotificationType.RESULT_SUBMITTED))).toBe(false);
      expect(isBilateralSubmittedNotification({})).toBe(false);
    });

    it('renders the server-composed suffix, like the other server-split types', () => {
      const parts = getResultNotificationTextParts(
        notificationOf(NotificationType.BILATERAL_RESULT_SUBMITTED, {
          text: 'was submitted for your review by AfricaRice.'
        })
      );

      expect(parts.prefix).toBe('The result');
      expect(parts.suffix).toBe('was submitted for your review by AfricaRice.');
    });
  });

  describe('getRejectionReasonLine (RRC-T-9, RRC-R-13)', () => {
    const rejected = (extra: any) => ({ obj_notification_type: { type: NotificationType.BILATERAL_RESULT_REJECTED }, ...extra });

    it('returns the trimmed comment when the row has an entry', () => {
      expect(getRejectionReasonLine(rejected({ has_review_entry: true, review_comment: '  Belongs to SP12 ' }))).toBe('Belongs to SP12');
    });

    it.each([null, '', '   ', undefined])('returns the fallback for an entry with comment %p', comment => {
      expect(getRejectionReasonLine(rejected({ has_review_entry: true, review_comment: comment }))).toBe('No justification was recorded.');
    });

    it.each([false, undefined])('returns null for a legacy row (has_review_entry %p), never the fallback', flag => {
      expect(getRejectionReasonLine(rejected({ has_review_entry: flag, review_comment: null }))).toBeNull();
      expect(getRejectionReasonLine(rejected({ has_review_entry: flag, review_comment: 'x' }))).toBeNull();
    });

    it('returns null for other types even if the fields are present', () => {
      const approved = { obj_notification_type: { type: NotificationType.BILATERAL_RESULT_APPROVED }, has_review_entry: true, review_comment: 'x' };
      expect(getRejectionReasonLine(approved)).toBeNull();
    });

    it('leaves the rejection sentence unchanged (RRC-R-16)', () => {
      const parts = getResultNotificationTextParts(rejected({ has_review_entry: true, review_comment: 'x' }));
      expect(parts.prefix).toBe('❌ Your Result');
      expect(parts.suffix).toBe('has been Rejected by the Science Program.');
    });
  });
});
