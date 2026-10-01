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
  RESULT_CONTRIBUTION_DECLINED = 'Result Contribution Declined',
  /** 2026-09-05 — a bilateral result reached Pending Review; sent to the primary SP's members. */
  BILATERAL_RESULT_SUBMITTED = 'Bilateral Result Submitted',
  /** An AI-assisted processing job finished. No result behind it (`result_id` is NULL). */
  BILATERAL_AI_JOB_FINISHED = 'Bilateral AI Job Finished',
  /**
   * PSR-T-8 (`bilateral-primary-sp-request`, forward pointer from PSR-T-7): the 3 Center-facing
   * informative notices (PSR-R-14). Server-composed sentences on `notification.text`, always with
   * the SP as subject and the literal substring "of this result" — see
   * `getResultNotificationTextParts()`'s case below for the splice that turns it into a single
   * sentence with the result link in place of that substring. These strings are exactly what
   * `notification.service.ts` seeds (design.md §3.1) — do not reword either side independently.
   */
  PRIMARY_PROGRAM_REQUEST_ACCEPTED = 'Primary Program Request Accepted',
  PRIMARY_PROGRAM_REQUEST_DECLINED = 'Primary Program Request Declined',
  PRIMARY_PROGRAM_REQUEST_MOVED = 'Primary Program Request Moved'
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
  /** Rendered immediately after the link, with no whitespace between (e.g. an attached comma). */
  linkTrailer?: string;
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
 * initiative relation the notification payload carries. Exported since 2026-09-05: the
 * submitted-for-review click routes to the SP's review queue, which needs this code in the URL.
 */
export function getProgramCode(notification: any): string | null {
  const initiatives = notification?.obj_result?.obj_result_by_initiatives;
  if (!Array.isArray(initiatives)) return null;

  for (const initiative of initiatives) {
    const code = initiative?.obj_initiative?.official_code;
    if (code) return code;
  }

  return null;
}

/**
 * NOTIF-T-12 (rework, 2026-09-30): `RESULT_BILATERAL_PROJECT_TAGGED`'s `notification.text` carries
 * one of two shapes, never distinguishable by type alone:
 *  - a bare project label (the AC1/AC2 direct-tag flow's current shape, `target.label` with no
 *    `leadIn` — see `result-tagged-notification.service.ts`'s `emitFor()`);
 *  - a whole server-composed sentence, `"${leadIn} has tagged the ${label}. Click to see the
 *    result."` — emitted whenever `leadIn` IS passed (the already-shipped `BCT-T-4` submission
 *    flow, `notifyBilateralContributorsOnSubmission()`), and also the shape every row written
 *    before this fix landed still has on disk.
 * Both composed-sentence sources share this exact literal template, so detecting either telltale
 * substring is sufficient — no need to special-case BCT vs. legacy separately.
 */
function isComposedProjectTaggedText(text: string): boolean {
  return text.includes(' has tagged the ') || text.trim().endsWith('Click to see the result.');
}

function buildBilateralReviewSuffix(decisionLabel: string, notification: any): string {
  const programCode = getProgramCode(notification);
  const programText = programCode ? `the Science Program ${programCode}` : 'the Science Program';
  return `has been ${decisionLabel} by ${programText}.`;
}

/**
 * NDCW-R-2: a decision notification addressed to a tagged centre carries a server-composed sentence
 * on `text` ("where your center was tagged, has been approved by ..."). It renders as
 * "The result <link>, <text>" — the comma is attached to the link via `linkTrailer`.
 * Returns null when there is no text (submitter copy, "Your Result").
 */
function buildCenterDecisionParts(notification: any): NotificationTextParts | null {
  const text = notification?.text?.trim();
  if (!text) return null;
  return { prefix: 'The result', linkTrailer: ',', suffix: text, emphasizePrefix: false };
}

/** A finished AI job notification, split into its sentence and its in-app destination. */
export interface AiJobNotificationParts {
  /** The server-composed sentence, without the trailing link. */
  message: string;
  /** App-relative path of the deep link (drafts or the failed job), or null when absent. */
  path: string | null;
}

export function isAiJobFinishedNotification(notification: any): boolean {
  return resolveNotificationType(notification) === NotificationType.BILATERAL_AI_JOB_FINISHED;
}

/**
 * The server stores the whole sentence on `text` followed by an absolute deep link
 * ("AI-assisted processing finished — 2 drafts ready for CIP · PDF · 3 min https://…/drafts").
 * There is no result, so the row must never render the "<code> - <title>" link.
 */
export function getAiJobNotificationParts(notification: any): AiJobNotificationParts | null {
  if (!isAiJobFinishedNotification(notification)) return null;

  const text: string = notification?.text?.trim() ?? '';
  const lastSpace = text.lastIndexOf(' ');
  const lastToken = lastSpace >= 0 ? text.slice(lastSpace + 1) : text;

  let path: string | null = null;
  let message = text;
  if (/^https?:\/\//.test(lastToken)) {
    message = text.slice(0, Math.max(lastSpace, 0)).trim();
    try {
      const url = new URL(lastToken);
      path = `${url.pathname}${url.search}` || null;
    } catch {
      path = null;
    }
  }

  return { message: message || 'Your AI-assisted processing job finished.', path };
}

/** The text of a result-level notification, split around the result link. */
export function getResultNotificationTextParts(notification: any): NotificationTextParts {
  const type = resolveNotificationType(notification);

  switch (type) {
    case NotificationType.BILATERAL_AI_JOB_FINISHED:
      return { prefix: getAiJobNotificationParts(notification)?.message ?? null, suffix: null, emphasizePrefix: false };

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
      return (
        buildCenterDecisionParts(notification) ?? {
          prefix: '✅ Your Result',
          suffix: buildBilateralReviewSuffix('Approved', notification),
          emphasizePrefix: true
        }
      );

    case NotificationType.BILATERAL_RESULT_REJECTED:
      return (
        buildCenterDecisionParts(notification) ?? {
          prefix: '❌ Your Result',
          suffix: buildBilateralReviewSuffix('Rejected', notification),
          emphasizePrefix: true
        }
      );

    // NOTIF-T-12 (`NOTIF-R-14`, corrected 2026-09-30, rework attempt 2): the server stores just the
    // tagged project's NAME on `notification.text` for the AC1/AC2 direct-tag flow (no `leadIn`) —
    // this case builds the full sentence client-side for THAT shape only. `BCT-T-4`'s submission
    // flow (`leadIn` present) and any pre-fix/legacy row still carry a whole composed sentence on
    // `text`, indistinguishable from the bare shape by type alone — `isComposedProjectTaggedText`
    // detects that shape (and the empty/null case) and falls back to `RESULT_CENTER_TAGGED`'s
    // rendering, which trusts `text` as an already-complete suffix.
    case NotificationType.RESULT_BILATERAL_PROJECT_TAGGED: {
      const text = notification?.text?.trim();
      if (!text || isComposedProjectTaggedText(text)) {
        return { prefix: 'The result', suffix: text || null, emphasizePrefix: false };
      }
      return {
        prefix: `${getEmitterName(notification)} from ${getProgramCode(notification) ?? 'a Science Program'} has tagged project ${text} as contributor to result`,
        suffix: null,
        emphasizePrefix: false
      };
    }

    // P2-3214 AC3. Unlike every other type, the variable half of this sentence names the tagged
    // centre — which cannot be derived from the result (a result carries several centres, and a
    // recipient may belong to more than one). The server composes it at emit time and ships it on
    // `notification.text`; we only supply the lead-in.
    case NotificationType.RESULT_CENTER_TAGGED:
    // P2-3188 shares the split: the server stores which Science Program decided, we supply the lead-in.
    case NotificationType.RESULT_CONTRIBUTION_ACCEPTED:
    case NotificationType.RESULT_CONTRIBUTION_DECLINED:
    // 2026-09-05 — same split: the server names the submitting lead centre, which the payload
    // cannot resolve client-side ("was submitted for your review by AfricaRice.").
    case NotificationType.BILATERAL_RESULT_SUBMITTED:
      return {
        prefix: 'The result',
        suffix: notification?.text?.trim() || null,
        emphasizePrefix: false
      };

    // PSR-T-8 (forward pointer from PSR-T-7's review): T-7's stored sentence has the SP as
    // subject ("SP09 accepted to be the primary Science Program of this result. Click to see the
    // result."). Rendering it as prefix "The result" + suffix (the `BILATERAL_RESULT_SUBMITTED`
    // pattern above) produces the exact garbled, two-subject sentence the Reviewer failed T-7's
    // attempt 1 for — never do that here. Instead splice the result identity in for the literal
    // substring "this result", the same splice `notification.service.ts` does server-side for the
    // socket push: the text before "this result" (which already ends "... of ") plus the literal
    // word "result" becomes `prefix` (rendered before the code–title link the template always
    // renders), and whatever follows — starting with the stored punctuation, e.g. ".  Click to see
    // the result." — is split into `linkTrailer` (leading punctuation, glued to the link with no
    // space) and `suffix` (the rest, trimmed). A stored sentence without the marker (or missing
    // entirely) renders standalone with no fabricated result reference.
    case NotificationType.PRIMARY_PROGRAM_REQUEST_ACCEPTED:
    case NotificationType.PRIMARY_PROGRAM_REQUEST_DECLINED:
    case NotificationType.PRIMARY_PROGRAM_REQUEST_MOVED: {
      const text = notification?.text?.trim();
      if (!text) return { prefix: 'The result', suffix: null, emphasizePrefix: false };

      const marker = 'this result';
      const idx = text.indexOf(marker);
      if (idx === -1) {
        // No splice point found — render the stored sentence standalone rather than inventing one.
        return { prefix: text, suffix: null, emphasizePrefix: false };
      }

      const prefix = `${text.slice(0, idx)}result`;
      const remainder = text.slice(idx + marker.length);
      const trailerMatch = remainder.match(/^([.,;:!?]*)\s*(.*)$/s);
      const linkTrailer = trailerMatch?.[1] || undefined;
      const suffix = trailerMatch?.[2]?.trim() || null;

      return { prefix, linkTrailer, suffix, emphasizePrefix: false };
    }

    default:
      // Deliberately neutral. The previous default claimed every unknown type had been "successfully
      // Quality Assessed", which mislabels any type added later.
      return { prefix: 'The result', suffix: null, emphasizePrefix: false };
  }
}

/** Flattened single-string form — for search indexes and plain-text contexts. */
export function buildResultNotificationText(notification: any): string {
  const aiJob = getAiJobNotificationParts(notification);
  if (aiJob) return aiJob.message;

  const { prefix, suffix, linkTrailer } = getResultNotificationTextParts(notification);
  const identity = `${notification?.obj_result?.result_code} - ${notification?.obj_result?.title}${linkTrailer ?? ''}`;

  return [prefix, identity, suffix].filter(part => !!part).join(' ');
}

/** True when the notification reports a bilateral review decision (approved or rejected). */
export function isBilateralReviewNotification(notification: any): boolean {
  const type = resolveNotificationType(notification);
  return type === NotificationType.BILATERAL_RESULT_APPROVED || type === NotificationType.BILATERAL_RESULT_REJECTED;
}

/**
 * True when the notification tells an SP member a bilateral result reached Pending Review
 * (2026-09-05). Routes to the SP's review queue rather than to the result or the centre dashboard.
 */
export function isBilateralSubmittedNotification(notification: any): boolean {
  return resolveNotificationType(notification) === NotificationType.BILATERAL_RESULT_SUBMITTED;
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
