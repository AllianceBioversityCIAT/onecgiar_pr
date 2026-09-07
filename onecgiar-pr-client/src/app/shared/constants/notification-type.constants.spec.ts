import {
  NotificationType,
  buildResultNotificationText,
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

    it('uses the same shape for the tagged-project type', () => {
      const notification = notificationOf(NotificationType.RESULT_BILATERAL_PROJECT_TAGGED, {
        text: 'created by SP04 has tagged the P-1568-WBS0. Click to see the result.'
      });

      expect(buildResultNotificationText(notification)).toContain('has tagged the P-1568-WBS0.');
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
