import { BILATERAL_DECISION_NOTICE_COPY } from '../../internationalization/bilateral-decision-notice.copy';
import { NOTIFICATION_CENTER_TAGGED_COPY } from '../../internationalization/notification-center-tagged.copy';
import { NOTIFICATION_PROJECT_TAGGED_COPY } from '../../internationalization/notification-project-tagged.copy';

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
  /**
   * Emphasized token rendered before `prefix` (WCT-T-4, DD-4). Optional — existing types never set
   * it, so their rendering is unchanged. Today only the `RESULT_CENTER_TAGGED` bare shape sets it,
   * to the owner Science Program's code.
   */
  lead?: string;
  /**
   * Mid-sentence emphasized/plain text parts, rendered in place of `lead` and `prefix` when
   * present, before the result link (WPT-R-2, DD-3). Optional — existing types never set it, so
   * their rendering is unchanged. Today only the enriched/legacy-bare
   * `RESULT_BILATERAL_PROJECT_TAGGED` branch sets it, to let the Science Program code, the project
   * code and the Center label each be bolded individually mid-sentence (which `lead` and `prefix`
   * alone can't do).
   */
  segments?: { text: string; emphasize: boolean }[];
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
 * NOTIF-T-12 (rework, 2026-09-30) / WCT-T-4: both `RESULT_BILATERAL_PROJECT_TAGGED` and
 * `RESULT_CENTER_TAGGED` store `notification.text` in one of two shapes, never distinguishable by
 * type alone:
 *  - a bare label (the direct-tag flow's current shape, `target.label` with no `leadIn` — see
 *    `result-tagged-notification.service.ts`'s `emitFor()`);
 *  - a whole server-composed sentence, `"${leadIn} has tagged the ${label}. Click to see the
 *    result."` — emitted whenever `leadIn` IS passed (the already-shipped `BCT-T-4` submission
 *    flow, `notifyBilateralContributorsOnSubmission()`), and also the shape every row written
 *    before this fix landed still has on disk.
 * Both composed-sentence sources share this exact literal template, so detecting either telltale
 * substring is sufficient — no need to special-case BCT vs. legacy separately.
 */
function isComposedTaggedText(text: string): boolean {
  return text.includes(' has tagged the ') || text.trim().endsWith('Click to see the result.');
}

/**
 * WPT-T-3 (`w1w2-project-tagged`, design §7.3/§8.1/§9, DD-2): splits an enriched bare
 * `RESULT_BILATERAL_PROJECT_TAGGED` row's stored text (`"<project code> (<Center label>)"`, WPT-R-1)
 * into its project code and Center label, anchored on the **last trailing** `(…)` with non-empty
 * contents. A legacy bare row (no trailing parenthetical, WPT-R-3) yields a null `centerLabel`. Only
 * called once the caller has already ruled out a composed or empty text (`isComposedTaggedText`) —
 * never apply this to a BCT/legacy composed sentence (its own trailing `(ABC).` must NOT be parsed,
 * WPT-R-4).
 *
 * `[^()]+` (not `.+`) inside the parens is what makes "last trailing" correct for a project name
 * that itself contains parentheses, e.g. `"Seeds (Phase 2) project (ABC)"` → code
 * `"Seeds (Phase 2) project"`, label `"ABC"` — greedy backtracking can't cross into the inner pair
 * because it contains no parens to exclude.
 *
 * DR-1 (accepted risk): a legacy bare row whose code came from the `fullName` fallback and itself
 * ends in `"(…)"` is misparsed as code+label — `short_name` is NOT NULL server-side, so this only
 * happens when `short_name` is empty.
 *
 * Keep in sync with the server twin: `onecgiar-pr-server/src/api/notification/notification.service.ts`
 * `parseTaggedProjectLabel`. Both pin the same five-shape table (design §9).
 */
function parseTaggedProjectLabel(text: string): { code: string; centerLabel: string | null } {
  const match = text.match(/^(.*)\(([^()]+)\)\s*$/);
  if (!match) return { code: text, centerLabel: null };

  const centerLabel = match[2].trim();
  if (!centerLabel) return { code: text, centerLabel: null };

  return { code: match[1].trim(), centerLabel };
}

/**
 * BPT-T-3 (`bilateral-project-tagged`, design §8.1, §9, requirements.md BPT-R-2/R-4): parses a
 * Center-reported `RESULT_BILATERAL_PROJECT_TAGGED` row's `text` — the shape the BCT flow writes
 * for a project target from now on — into its reporter, project code and owner, end-anchored:
 * `"<reporter> has tagged the bilateral project <code> from your center (<owner>)"`. Reporter is
 * the shortest prefix before ` has tagged the bilateral project `; code is everything up to the
 * LAST ` from your center (` (so a code containing its own parentheses, e.g. `Seeds (Phase 2)`,
 * stays intact — mirrors `parseTaggedProjectLabel`'s last-trailing-parens rule); owner is the
 * non-empty `[^()]+` inside the final parens. Returns `null` when the pattern doesn't match, or
 * when any part is empty after trimming (including an empty `()`, which `[^()]+` already rules out).
 *
 * This runs BEFORE `isComposedTaggedText` in the `RESULT_BILATERAL_PROJECT_TAGGED` case (design
 * DD-3), so a legacy/BCT-T-4 composed sentence (ends in `. Click to see the result.`, says "of
 * your center") and a W1/W2 bare/enriched row (no ` has tagged the bilateral project ` substring)
 * can never match here (BPT-R-4) — and a Center-reported row itself contains the substring
 * ` has tagged the `, so without this ordering it would be misdetected as composed.
 *
 * Keep in sync with the server twin:
 * `onecgiar-pr-server/src/api/notification/notification.service.ts`'s
 * `parseCenterReportedProjectText`. Both pin the identical shape table (design §9, BPT-NFR-2).
 */
export function parseCenterReportedProjectText(text: string): { reporter: string; code: string; owner: string } | null {
  const match = text.match(/^(.+?) has tagged the bilateral project (.+) from your center \(([^()]+)\)\s*$/);
  if (!match) return null;

  const reporter = match[1].trim();
  const code = match[2].trim();
  const owner = match[3].trim();
  if (!reporter || !code || !owner) return null;

  return { reporter, code, owner };
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

/**
 * SACN-T-3 (`notifications/sp-approval-center-notice`, design §8.2, SACN-R-3/R-4/R-5/R-7): a center
 * recipient's Approve row stores one of two exact sentences on `text` — `"<SPXX>${verb}"` or the
 * whole `fallbackLead` — both ending in the fixed `tail`. Detected by that tail FIRST, since the
 * legacy center sentence (`buildCenterDecisionParts`, "where your center was tagged … approved by
 * the Science Program SPXX.") never ends in it. Returns `segments` (bold SP code + plain verb, or
 * the unbolded fallback lead alone) so the template renders the WPT-style mid-sentence bold — and
 * `prefix` set to the same joined text, purely so `buildResultNotificationText` (search/plain-text)
 * flattens to the identical string without needing its own segments-aware branch (same trick as the
 * `RESULT_BILATERAL_PROJECT_TAGGED` case below). Never applied outside `BILATERAL_RESULT_APPROVED`
 * (SACN-R-7's Rejected cases, and any other type, fall straight through to today's logic) — the
 * caller gates that, not this function.
 */
function buildApprovedCenterNoticeParts(notification: any): NotificationTextParts | null {
  const text = notification?.text?.trim();
  if (!text || !text.endsWith(BILATERAL_DECISION_NOTICE_COPY.tail)) return null;

  if (text === BILATERAL_DECISION_NOTICE_COPY.fallbackLead) {
    return {
      prefix: BILATERAL_DECISION_NOTICE_COPY.fallbackLead,
      suffix: null,
      emphasizePrefix: false,
      segments: [{ text: BILATERAL_DECISION_NOTICE_COPY.fallbackLead, emphasize: false }]
    };
  }

  const { verb } = BILATERAL_DECISION_NOTICE_COPY;
  if (!text.endsWith(verb)) return null;

  const code = text.slice(0, text.length - verb.length);
  if (!code) return null;

  return {
    prefix: `${code}${verb}`,
    suffix: null,
    emphasizePrefix: false,
    segments: [
      { text: code, emphasize: true },
      { text: verb, emphasize: false }
    ]
  };
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

    // P2-3157 AC2. SACN-T-3: the new-shape center notice is tried FIRST (Approve only) — it falls
    // through to the legacy center/submitter rendering for anything it doesn't recognise.
    case NotificationType.BILATERAL_RESULT_APPROVED:
      return (
        buildApprovedCenterNoticeParts(notification) ??
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

    // WPT-T-3 (`w1w2-project-tagged`, design §7.3/§8.1/§9, DD-2/DD-3, amends NOTIF-T-12): the
    // server now stores `"<project code> (<Center label>)"` on `notification.text` for the
    // direct-tag flow's AC1/AC2 (an enriched bare row, WPT-R-1) — this case builds the full
    // sentence client-side for THAT shape AND for a legacy bare row (no trailing `(…)`, WPT-R-3),
    // via `parseTaggedProjectLabel`. The emitter, the Science Program code, the project code and
    // (when present) the Center label are each their own emphasized `segments` entry (DD-3), since
    // `lead`/`prefix` alone can't bold three separate mid-sentence tokens. `BCT-T-4`'s submission
    // flow (`leadIn` present) and any pre-fix/legacy composed row still carry a whole composed
    // sentence on `text`, indistinguishable from the bare shape by type alone —
    // `isComposedTaggedText` (shared with `RESULT_CENTER_TAGGED`, WCT-T-4/DD-2) detects that shape
    // (and the empty/null case) FIRST (WPT-R-4: a BCT `(ABC).` must never be parsed) and falls back
    // to the pre-existing prefix/suffix rendering, trusting `text` as an already-complete suffix. No
    // `segments` are set on that fallback path.
    case NotificationType.RESULT_BILATERAL_PROJECT_TAGGED: {
      const text = notification?.text?.trim();

      // BPT-T-3 (design §8.1, DD-3): the Center-reported shape (new BCT project rows, BPT-R-1)
      // is self-describing — reporter, project code and owner are already on `text`, end-anchored
      // — so it's checked FIRST, before the composed/bare detection below. Its own text contains
      // " has tagged the ", so without this ordering it would be misdetected as a composed
      // sentence by `isComposedTaggedText` (BPT-R-4, the order falsifier).
      const centerReported = text ? parseCenterReportedProjectText(text) : null;
      if (centerReported) {
        const segments: { text: string; emphasize: boolean }[] = [
          { text: centerReported.reporter, emphasize: true },
          { text: ` ${NOTIFICATION_PROJECT_TAGGED_COPY.verb} `, emphasize: false },
          { text: centerReported.code, emphasize: true },
          { text: ` ${NOTIFICATION_PROJECT_TAGGED_COPY.centerClauseWithLabel.before}`, emphasize: false },
          { text: centerReported.owner, emphasize: true },
          { text: NOTIFICATION_PROJECT_TAGGED_COPY.centerClauseWithLabel.after, emphasize: false }
        ];

        return {
          prefix: segments.map(segment => segment.text).join(''),
          suffix: null,
          emphasizePrefix: false,
          segments
        };
      }

      if (!text || isComposedTaggedText(text)) {
        return { prefix: 'The result', suffix: text || null, emphasizePrefix: false };
      }

      const emitter = getEmitterName(notification);
      const programCode = getProgramCode(notification) ?? 'a Science Program';
      const { code, centerLabel } = parseTaggedProjectLabel(text);

      const segments: { text: string; emphasize: boolean }[] = [
        { text: `${emitter} from `, emphasize: false },
        { text: programCode, emphasize: true },
        { text: ` ${NOTIFICATION_PROJECT_TAGGED_COPY.verb} `, emphasize: false },
        { text: code, emphasize: true }
      ];
      if (centerLabel) {
        segments.push({ text: ` ${NOTIFICATION_PROJECT_TAGGED_COPY.centerClauseWithLabel.before}`, emphasize: false });
        segments.push({ text: centerLabel, emphasize: true });
        segments.push({ text: NOTIFICATION_PROJECT_TAGGED_COPY.centerClauseWithLabel.after, emphasize: false });
      } else {
        segments.push({ text: ` ${NOTIFICATION_PROJECT_TAGGED_COPY.centerClauseNoLabel}`, emphasize: false });
      }

      return {
        prefix: segments.map(segment => segment.text).join(''),
        suffix: null,
        emphasizePrefix: false,
        segments
      };
    }

    // WCT-T-4 (`w1w2-center-tagged`, DD-1/DD-2/DD-4): the server now stores the bare tagged
    // Center's acronym (falling back to its code) on `notification.text` for the direct-tag flow
    // (W1/W2 partners save, IPSR contributors save, SP review of a bilateral result) — this case
    // builds the full sentence client-side for THAT shape only, naming the owner Science Program as
    // `lead` (DD-4: a separate emphasized part rather than bolding the whole prefix). Legacy rows
    // and the already-shipped BCT submission flow (`leadIn` passed) still carry a whole composed
    // sentence on `text`, indistinguishable from the bare shape by type alone —
    // `isComposedTaggedText` (shared with NOTIF-T-12, DD-2) detects that shape (and the empty/null
    // case) and falls back to the pre-existing rendering, which trusts `text` as an already-complete
    // suffix (WCT-R-7).
    case NotificationType.RESULT_CENTER_TAGGED: {
      const text = notification?.text?.trim();
      if (!text || isComposedTaggedText(text)) {
        return { prefix: 'The result', suffix: text || null, emphasizePrefix: false };
      }
      return {
        lead: getProgramCode(notification) ?? 'a Science Program',
        prefix: NOTIFICATION_CENTER_TAGGED_COPY.sentence(text),
        suffix: null,
        emphasizePrefix: false
      };
    }

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

  const { lead, prefix, suffix, linkTrailer } = getResultNotificationTextParts(notification);
  const identity = `${notification?.obj_result?.result_code} - ${notification?.obj_result?.title}${linkTrailer ?? ''}`;

  return [lead, prefix, identity, suffix].filter(part => !!part).join(' ');
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
