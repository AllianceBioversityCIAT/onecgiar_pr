export type FeedbackType = 'bug' | 'adjustment';

/** Jira priority ids for project P2 — the only values the endpoint accepts. */
export const FEEDBACK_PRIORITY_IDS = ['1', '2', '3', '4', '5'] as const;
export type FeedbackPriorityId = (typeof FEEDBACK_PRIORITY_IDS)[number];

/** One file the user attached, inlined as base64 (main.ts allows a 50mb body). */
export class FeedbackAttachmentDto {
  /** File name shown in Jira. */
  name: string;
  /** e.g. 'image/png'. Only images are accepted. */
  mimeType: string;
  /** Raw base64, with or without the `data:...;base64,` prefix. */
  dataBase64: string;
}

export class CreateFeedbackDto {
  /** 'bug' → Jira Bug · 'adjustment' → Jira Enhancement */
  type: FeedbackType;
  /** Short title → Jira summary */
  title: string;
  /** Free text description → Jira description */
  description: string;
  /** URL/screen where the user was when reporting (auto context) */
  contextUrl?: string;
  /** Browser user agent (auto context) */
  userAgent?: string;
  /** Jira priority id, chosen by the user. Defaults to Medium ('3'). */
  priority?: FeedbackPriorityId;
  /** Screenshots: the automatic one, plus whatever the user attached. */
  attachments?: FeedbackAttachmentDto[];
  /**
   * Console errors/warnings collected in the browser. They go to an internal
   * sub-task, never to the issue the reporter sees.
   */
  consoleLogs?: string[];
}

/** Body of "this already happened to me too" — adds the user to an existing report. */
export class MeTooFeedbackDto {
  /** Key of the issue the user recognised as their own problem. */
  issueKey: string;
}
