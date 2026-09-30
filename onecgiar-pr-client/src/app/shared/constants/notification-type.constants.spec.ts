import {
  NotificationType,
  buildResultNotificationText,
  getAiJobNotificationParts,
  getNotificationActionVerb,
  getResultNotificationTextParts,
  isBilateralReviewNotification,
  isBilateralSubmittedNotification,
  isResultTaggedNotification,
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

  // NOTIF-T-12 (`NOTIF-R-14`, corrected 2026-09-30): the server now stores just the tagged
  // project's NAME on `notification.text` (not a whole composed sentence) — the client builds the
  // full sentence, naming the emitter and Science Program itself, unlike `RESULT_CENTER_TAGGED`
  // above (which keeps the server-composed suffix).
  describe('tagged bilateral project text (NOTIF-T-12)', () => {
    it('builds the full sentence from the emitter, program code and stored project name', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'P-1568-WBS0'
      });

      expect(buildResultNotificationText(notification)).toBe(
        'Jane Doe from SP5 has tagged project P-1568-WBS0 as contributor to result 4321 - A bilateral result title'
      );
    });

    it('falls back to "a Science Program" when no program code is available', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'P-1568-WBS0',
        obj_result: resultOf({ obj_result_by_initiatives: [] })
      });

      const parts = getResultNotificationTextParts(notification);
      expect(parts.prefix).toContain('from a Science Program has tagged project P-1568-WBS0 as contributor to result');
      expect(parts.suffix).toBeNull();
      expect(parts.emphasizePrefix).toBe(false);
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
        'Jane Doe from SP5 has tagged project P-1568-WBS0 as contributor to result 4321 - A bilateral result title'
      );
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
});
