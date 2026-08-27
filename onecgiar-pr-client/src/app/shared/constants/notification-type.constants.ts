/**
 * Notification types, keyed by NAME rather than by database id.
 *
 * Mirrors the server enum in `onecgiar-pr-server/src/api/notification/enum/notification.enum.ts`.
 *
 * Why by name: `notifications_type` rows have historically been inserted by hand in each
 * environment, so `notifications_type_id` is NOT guaranteed to be the same number in test and in
 * production. The server always resolves a type by its `type` string and ships the relation
 * (`obj_notification_type`) in every notification payload, so the client can — and should — do the
 * same. See P2-3157.
 */
export enum NotificationType {
  RESULT_CREATED = 'Result Created',
  RESULT_SUBMITTED = 'Result Submitted',
  RESULT_UNSUBMITTED = 'Result Unsubmitted',
  RESULT_QUALITY_ASSESSED = 'Result QAed',
  ANNOUNCEMENT = 'Announcement',
  BILATERAL_RESULT_APPROVED = 'Bilateral Result Approved',
  BILATERAL_RESULT_REJECTED = 'Bilateral Result Rejected',
  RESULT_CENTER_TAGGED = 'Result Center Tagged',
  RESULT_BILATERAL_PROJECT_TAGGED = 'Result Bilateral Project Tagged',
  RESULT_CONTRIBUTION_ACCEPTED = 'Result Contribution Accepted',
  RESULT_CONTRIBUTION_DECLINED = 'Result Contribution Declined'
}

/**
 * Last-resort mapping for payloads that arrive without `obj_notification_type`.
 *
 * These ids reflect the seed order observed in the environments this client has run against; they
 * are NOT authoritative and must never be the primary lookup. Kept only so older/partial payloads
 * keep rendering the text they rendered before the name-based resolution landed.
 */
const LEGACY_TYPE_IDS: Record<number, NotificationType> = {
  1: NotificationType.RESULT_SUBMITTED,
  2: NotificationType.RESULT_UNSUBMITTED,
  3: NotificationType.RESULT_QUALITY_ASSESSED,
  4: NotificationType.ANNOUNCEMENT,
  5: NotificationType.RESULT_CREATED
};

/** Types whose copy reads "<emitter> has <verb> the result <code> - <title>". */
const ACTOR_VERBS: Partial<Record<NotificationType, string>> = {
  [NotificationType.RESULT_SUBMITTED]: 'submitted',
  [NotificationType.RESULT_UNSUBMITTED]: 'unsubmitted',
  [NotificationType.RESULT_CREATED]: 'created'
};

/** A notification's text, split around the result link so templates can keep the anchor. */
export interface NotificationTextParts {
  /** Rendered before the "<code> - <title>" link. */
  prefix: string | null;
  /** Rendered after the link. */
  suffix: string | null;
  /**
   * Whether the prefix carries the emphasis. Preserves the pre-existing rendering: an actor phrase
   * ("Jane Doe has submitted the result") was bold, while the bare lead-in ("The result") was not.
   */
  emphasizePrefix: boolean;
}

/** Resolves the type by name, falling back to the legacy numeric id. */
export function resolveNotificationType(notification: any): NotificationType | null {
  const byName = notification?.obj_notification_type?.type;
  if (byName && Object.values(NotificationType).includes(byName)) {
    return byName as NotificationType;
  }

  const byId = Number(notification?.notification_type);
  return Number.isFinite(byId) ? (LEGACY_TYPE_IDS[byId] ?? null) : null;
}

/**
 * Verb for the types phrased as an action by a user. Empty string for every other type, matching
 * the behaviour of the four switch statements this replaced.
 */
export function getNotificationActionVerb(notification: any): string {
  const type = resolveNotificationType(notification);

  if (type === NotificationType.RESULT_QUALITY_ASSESSED) {
    return 'Quality Assessed';
  }

  return type ? (ACTOR_VERBS[type] ?? '') : '';
}

function getEmitterName(notification: any): string {
  const first = notification?.obj_emitter_user?.first_name ?? '';
  const last = notification?.obj_emitter_user?.last_name ?? '';
  return `${first} ${last}`.trim() || 'A user';
}

/**
 * Official code of the owner (submitting) Science Program — `initiative_role_id = 1`, the only
 * initiative relation the notification payload carries.
 */
function getProgramCode(notification: any): string | null {
  const initiatives = notification?.obj_result?.obj_result_by_initiatives;
  if (!Array.isArray(initiatives)) return null;

  for (const initiative of initiatives) {
    const code = initiative?.obj_initiative?.official_code;
    if (code) return code;
  }

  return null;
}

function buildBilateralReviewSuffix(decisionLabel: string, notification: any): string {
  const programCode = getProgramCode(notification);
  const programText = programCode ? `the Science Program ${programCode}` : 'the Science Program';
  return `has been ${decisionLabel} by ${programText}.`;
}

/** The text of a result-level notification, split around the result link. */
export function getResultNotificationTextParts(notification: any): NotificationTextParts {
  const type = resolveNotificationType(notification);

  switch (type) {
    case NotificationType.RESULT_SUBMITTED:
    case NotificationType.RESULT_UNSUBMITTED:
    case NotificationType.RESULT_CREATED:
      return {
        prefix: `${getEmitterName(notification)} has ${getNotificationActionVerb(notification)} the result`,
        suffix: null,
        emphasizePrefix: true
      };

    case NotificationType.RESULT_QUALITY_ASSESSED:
      return { prefix: 'The result', suffix: 'was successfully Quality Assessed.', emphasizePrefix: false };

    // P2-3157 AC2
    case NotificationType.BILATERAL_RESULT_APPROVED:
      return {
        prefix: '✅ Your Result',
        suffix: buildBilateralReviewSuffix('Approved', notification),
        emphasizePrefix: true
      };

    case NotificationType.BILATERAL_RESULT_REJECTED:
      return {
        prefix: '❌ Your Result',
        suffix: buildBilateralReviewSuffix('Rejected', notification),
        emphasizePrefix: true
      };

    // P2-3214 AC3. Unlike every other type, the variable half of this sentence names the tagged
    // centre or project — which cannot be derived from the result (a result carries several
    // centres, and a recipient may belong to more than one). The server composes it at emit time
    // and ships it on `notification.text`; we only supply the lead-in.
    case NotificationType.RESULT_CENTER_TAGGED:
    case NotificationType.RESULT_BILATERAL_PROJECT_TAGGED:
    // P2-3188 shares the split: the server stores which Science Program decided, we supply the lead-in.
    case NotificationType.RESULT_CONTRIBUTION_ACCEPTED:
    case NotificationType.RESULT_CONTRIBUTION_DECLINED:
      return {
        prefix: 'The result',
        suffix: notification?.text?.trim() || null,
        emphasizePrefix: false
      };

    default:
      // Deliberately neutral. The previous default claimed every unknown type had been "successfully
      // Quality Assessed", which mislabels any type added later.
      return { prefix: 'The result', suffix: null, emphasizePrefix: false };
  }
}

/** Flattened single-string form — for search indexes and plain-text contexts. */
export function buildResultNotificationText(notification: any): string {
  const { prefix, suffix } = getResultNotificationTextParts(notification);
  const identity = `${notification?.obj_result?.result_code} - ${notification?.obj_result?.title}`;

  return [prefix, identity, suffix].filter(part => !!part).join(' ');
}

/** True when the notification reports a bilateral review decision (approved or rejected). */
export function isBilateralReviewNotification(notification: any): boolean {
  const type = resolveNotificationType(notification);
  return type === NotificationType.BILATERAL_RESULT_APPROVED || type === NotificationType.BILATERAL_RESULT_REJECTED;
}

/** True when the notification reports an SP contributor's decision on a contribution (P2-3188). */
export function isContributionDecisionNotification(notification: any): boolean {
  const type = resolveNotificationType(notification);
  return type === NotificationType.RESULT_CONTRIBUTION_ACCEPTED || type === NotificationType.RESULT_CONTRIBUTION_DECLINED;
}

/** True when the notification reports the recipient's centre or bilateral project being tagged. */
export function isResultTaggedNotification(notification: any): boolean {
  const type = resolveNotificationType(notification);
  return type === NotificationType.RESULT_CENTER_TAGGED || type === NotificationType.RESULT_BILATERAL_PROJECT_TAGGED;
}
