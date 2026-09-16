// @akili-spec changes/bilateral-ai-draft-filters
import { BilateralAiDraft } from '../../../services/bilateral-ai.interfaces';

export function normalizeProjectId(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

export interface MyDraftResultsFilterContext {
  projectNameMap: Record<number, string>;
  resolvedUserNames: Record<number, string>;
  currentUserId?: number | null;
  currentUserName?: string | null;
}

export interface CreatedByFilterOption {
  value: string;
  label: string;
}

/** `null`/`undefined`/`''` mean no user id; ids compare as trimmed strings. */
export function normalizeUserId(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizeSearch(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim().toLowerCase();
}

/** Display label for a draft's creator — mirrors card badge rules in my-draft-results.component.ts */
export function resolveCreatorDisplayLabel(
  draft: BilateralAiDraft,
  context: MyDraftResultsFilterContext
): string {
  const jobUserId = draft.job?.user_id;
  const currentUserId = context.currentUserId;
  const isCurrentUser =
    currentUserId != null && jobUserId != null && Number(currentUserId) === Number(jobUserId);

  const jobUser = draft.job?.user;
  const jobUserName =
    [jobUser?.first_name, jobUser?.last_name].filter(Boolean).join(' ').trim() ||
    (jobUserId != null ? context.resolvedUserNames[jobUserId] ?? '' : '');

  if (isCurrentUser) return 'Me';
  if (jobUserName) return jobUserName;
  if (jobUser?.email) return jobUser.email;
  if (jobUserId != null) return 'Center Colleague';
  return '';
}

/** Search haystack: title, indicator, project label/code, creator display name */
export function buildDraftSearchHaystack(
  draft: BilateralAiDraft,
  context: MyDraftResultsFilterContext
): string {
  const parts: string[] = [];
  const mds = draft.extracted_mds ?? {};
  if (mds['title']) parts.push(String(mds['title']));
  if (mds['indicator']) parts.push(String(mds['indicator']));

  const projectId = normalizeProjectId(draft.job?.project_id);
  if (projectId) {
    const mapped = context.projectNameMap[Number(projectId)];
    if (mapped) parts.push(mapped);
    parts.push(projectId);
  }

  const creator = resolveCreatorDisplayLabel(draft, context);
  if (creator) {
    parts.push(creator);
    if (creator === 'Me' && context.currentUserName) parts.push(context.currentUserName);
  }

  return normalizeSearch(parts.join(' '));
}

/** Distinct creator options from loaded drafts — value is normalized user id. */
export function buildCreatedByFilterOptions(
  drafts: BilateralAiDraft[],
  context: MyDraftResultsFilterContext
): CreatedByFilterOption[] {
  const byId = new Map<string, CreatedByFilterOption>();

  for (const draft of drafts ?? []) {
    const userId = normalizeUserId(draft.job?.user_id);
    if (!userId || byId.has(userId)) continue;
    const label = resolveCreatorDisplayLabel(draft, context) || userId;
    byId.set(userId, { value: userId, label: label === 'Me' ? 'Me' : label });
  }

  return [...byId.values()].sort((a, b) => {
    if (a.label === 'Me') return -1;
    if (b.label === 'Me') return 1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  });
}

export function createdByChipLabel(userId: string, context: MyDraftResultsFilterContext, drafts: BilateralAiDraft[]): string {
  const match = drafts.find(d => normalizeUserId(d.job?.user_id) === userId);
  if (match) return resolveCreatorDisplayLabel(match, context) || userId;
  if (context.currentUserId != null && userId === normalizeUserId(context.currentUserId)) return 'Me';
  return userId;
}
