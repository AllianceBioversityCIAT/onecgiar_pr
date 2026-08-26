export type FeedbackType = 'bug' | 'adjustment';

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
}
