import { PtCenterRefDto, PtProposalDto, isSafeHttpUrl } from './components/pt-results-browse/pt-results-browse.component';

/**
 * Progress Tracker prefill, Phase 1 + matched partners (2026-10-19, `PTB-R-18a` — amends
 * `PTB-R-18`, which kept the prefill to title / type / description).
 *
 * Pure helpers only: what the drawer may prefill (contribution, centers), what travels to the
 * server in `progress_tracker_prefill` (evidence links, matched partners), and what is left for the
 * user as a "Pending from Progress Tracker" checklist. Geography, impact areas, gender split and the
 * type-specific blocks (innovation, policy change, capacity sharing) are never applied.
 */

export type PtFieldPolicy = 'apply' | 'suggest' | 'none';

/** Main evidences a result shows in Evidence; more would only bury the useful ones. */
export const PT_EVIDENCE_LINKS_MAX = 6;

export interface PtPrefillEvidenceLink {
  url: string;
  title: string;
}

export interface PtPrefillPartner {
  clarisa_id: number;
  name: string;
}

/** Body of `progress_tracker_prefill` on `POST results-framework-reporting/create`. */
export interface PtPrefillBlock {
  evidence_links: PtPrefillEvidenceLink[];
  partners: PtPrefillPartner[];
}

export interface PtPendingItem {
  label: string;
  detail?: string;
}

/** The PRMS center shape this file needs (`CentersService.centers()`). */
export interface PtCatalogueCenter {
  code: string;
  acronym?: string | null;
  name?: string | null;
}

/**
 * PT's policy for a field: the first key present wins. `null` = PT sent no policy for it, which
 * this file treats as `apply` for the prefillable fields (the 2-oct build sends no policy map).
 * A nested map (e.g. `impact_areas: { gender: 'apply', … }`) is not a single policy → `null`.
 */
export function ptFieldPolicy(proposal: Pick<PtProposalDto, 'policy'> | null | undefined, ...keys: string[]): PtFieldPolicy | null {
  const policy = proposal?.policy;
  if (!policy) return null;
  for (const key of keys) {
    const value = policy[key];
    if (value === 'apply' || value === 'suggest' || value === 'none') return value;
  }
  return null;
}

const mayApply = (policy: PtFieldPolicy | null): boolean => policy === null || policy === 'apply';

const CONTRIBUTION_POLICY_KEYS = ['contribution', 'contribution_value', 'contribution_to_indicator_target'];
const CENTERS_POLICY_KEYS = ['centers', 'contributing_centers', 'lead_center'];
const EVIDENCE_LINKS_POLICY_KEYS = ['evidence_links'];
const PARTNERS_POLICY_KEYS = ['partners'];

/** The numeric contribution PT lets the drawer prefill; `null` when absent, non-numeric or `suggest`/`none`. */
export function ptContributionToApply(proposal: PtProposalDto | null | undefined): number | null {
  const value = proposal?.contribution_value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return mayApply(ptFieldPolicy(proposal, ...CONTRIBUTION_POLICY_KEYS)) ? value : null;
}

/** Only http(s), deduped on the trimmed URL (trailing slash ignored), capped at {@link PT_EVIDENCE_LINKS_MAX}. */
export function ptEvidenceLinksToSave(proposal: PtProposalDto | null | undefined): PtPrefillEvidenceLink[] {
  if (!proposal || !mayApply(ptFieldPolicy(proposal, ...EVIDENCE_LINKS_POLICY_KEYS))) return [];
  const seen = new Set<string>();
  const links: PtPrefillEvidenceLink[] = [];
  for (const link of proposal.evidence_links ?? []) {
    if (!isSafeHttpUrl(link?.url)) continue;
    const url = link.url.trim();
    const key = url.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ url, title: (link.title ?? '').trim() || url });
    if (links.length === PT_EVIDENCE_LINKS_MAX) break;
  }
  return links;
}

/**
 * Partners the server saves as predicted (`is_predicted`): `matched` in CLARISA, with an id, and
 * not a CGIAR center (centers go through the centers field). Deduped on the CLARISA id. PT's
 * policy only stops them when it is `none` — a `suggest` partner that is matched is still saved,
 * flagged as predicted, per the approval of 2026-10-19.
 */
export function ptMatchedPartners(proposal: PtProposalDto | null | undefined): PtPrefillPartner[] {
  if (!proposal || ptFieldPolicy(proposal, ...PARTNERS_POLICY_KEYS) === 'none') return [];
  const seen = new Set<number>();
  const partners: PtPrefillPartner[] = [];
  for (const partner of proposal.partners ?? []) {
    const id = partner?.clarisa_id;
    if (partner?.match_status !== 'matched' || partner.is_cgiar_center === true) continue;
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    partners.push({ clarisa_id: id, name: partner.name });
  }
  return partners;
}

/** `null` when there is nothing to send, so the key stays ABSENT from the create body. */
export function buildPtPrefillBlock(proposal: PtProposalDto | null | undefined): PtPrefillBlock | null {
  const evidence_links = ptEvidenceLinksToSave(proposal);
  const partners = ptMatchedPartners(proposal);
  return evidence_links.length || partners.length ? { evidence_links, partners } : null;
}

const norm = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** Every center PT names: lead first, then contributing, then partners flagged `is_cgiar_center`. */
function ptCenterRefs(proposal: PtProposalDto): PtCenterRefDto[] {
  const fromPartners = (proposal.partners ?? [])
    .filter(partner => partner?.is_cgiar_center === true)
    .map(partner => ({ name: partner.name, acronym: partner.acronym, code: null }));
  return [...(proposal.lead_center ? [proposal.lead_center] : []), ...(proposal.contributing_centers ?? []), ...fromPartners];
}

/** Code, then acronym, then name — PT sometimes puts the acronym in `name`, so `name` also tries the acronym. */
function findCenter(ref: PtCenterRefDto, catalogue: PtCatalogueCenter[]): PtCatalogueCenter | null {
  const code = norm(ref.code);
  const acronym = norm(ref.acronym);
  const name = norm(ref.name);
  return (
    (code && catalogue.find(c => norm(c.code) === code)) ||
    (acronym && catalogue.find(c => norm(c.acronym) === acronym)) ||
    (name && catalogue.find(c => norm(c.name) === name || norm(c.acronym) === name)) ||
    null
  );
}

const centerRefLabel = (ref: PtCenterRefDto): string => ref.name || ref.acronym || ref.code || '';

/**
 * PT's centers mapped to the PRMS catalogue, deduped on `code`, plus the ones that did not map.
 * `suggest` / `none` for centers → nothing is preselected and every named center is unmatched
 * (`suggest` lists them in the checklist; `none` lists nothing — see {@link buildPtPendingChecklist}).
 */
export function resolvePtCenters(
  proposal: PtProposalDto | null | undefined,
  catalogue: PtCatalogueCenter[]
): { matched: PtCatalogueCenter[]; unmatched: string[] } {
  if (!proposal) return { matched: [], unmatched: [] };
  const refs = ptCenterRefs(proposal);
  if (!mayApply(ptFieldPolicy(proposal, ...CENTERS_POLICY_KEYS))) {
    return { matched: [], unmatched: [...new Set(refs.map(centerRefLabel).filter(Boolean))] };
  }
  const matched: PtCatalogueCenter[] = [];
  const unmatched = new Set<string>();
  for (const ref of refs) {
    const center = findCenter(ref, catalogue ?? []);
    if (!center) {
      const label = centerRefLabel(ref);
      if (label) unmatched.add(label);
      continue;
    }
    if (!matched.some(c => c.code === center.code)) matched.push(center);
  }
  return { matched, unmatched: [...unmatched] };
}

/**
 * Everything PT suggested that the drawer did NOT apply. Shown under the pick banner and again
 * once the result is created (the drawer navigates away, so the alert carries it to Result Detail).
 */
export function buildPtPendingChecklist(proposal: PtProposalDto | null | undefined, catalogue: PtCatalogueCenter[]): PtPendingItem[] {
  if (!proposal) return [];
  const items: PtPendingItem[] = [];

  for (const field of proposal.to_complete_in_prms ?? []) items.push({ label: field });

  const contribution = proposal.contribution_value;
  if (
    typeof contribution === 'number' &&
    ptContributionToApply(proposal) === null &&
    ptFieldPolicy(proposal, ...CONTRIBUTION_POLICY_KEYS) === 'suggest'
  ) {
    items.push({ label: 'Contribution to indicator target', detail: `Progress Tracker suggests ${contribution}` });
  }

  if (ptFieldPolicy(proposal, ...CENTERS_POLICY_KEYS) !== 'none') {
    for (const name of resolvePtCenters(proposal, catalogue).unmatched) {
      items.push({ label: `CGIAR center: ${name}`, detail: 'Not preselected — check it in Contributors and partners' });
    }
  }

  const savedPartnerIds = new Set(ptMatchedPartners(proposal).map(p => p.clarisa_id));
  if (ptFieldPolicy(proposal, ...PARTNERS_POLICY_KEYS) !== 'none') {
    for (const partner of proposal.partners ?? []) {
      if (partner?.is_cgiar_center === true) continue;
      if (typeof partner?.clarisa_id === 'number' && savedPartnerIds.has(partner.clarisa_id)) continue;
      const candidates = (partner.clarisa_candidates ?? []).map(c => (c.clarisa_id ? `${c.name} (CLARISA ${c.clarisa_id})` : c.name)).join('; ');
      items.push({
        label: `Partner: ${partner.name}`,
        detail: candidates ? `Not matched in CLARISA. Candidates: ${candidates}` : 'Not matched in CLARISA'
      });
    }
  }

  if (proposal.led_by_external_partner === true) {
    items.push({ label: 'Lead partner', detail: 'Progress Tracker says an external partner leads this result' });
  }

  const evidencePolicy = ptFieldPolicy(proposal, ...EVIDENCE_LINKS_POLICY_KEYS);
  const linkCount = (proposal.evidence_links ?? []).length;
  if (evidencePolicy === 'suggest' && linkCount) {
    items.push({ label: 'Evidence links', detail: `${linkCount} suggested by Progress Tracker` });
  }

  const geo = proposal.geo;
  if (geo) {
    const parts = [
      geo.level ? `scope ${geo.level}` : '',
      geo.countries.length ? `countries ${geo.countries.map(c => c.name).join(', ')}` : '',
      geo.regions.length ? `regions ${geo.regions.map(r => r.name).join(', ')}` : '',
      geo.subnational_areas ? `subnational ${geo.subnational_areas}` : ''
    ].filter(Boolean);
    items.push({ label: 'Geographic location', detail: parts.join('; ') });
  }

  const scored = (proposal.impact_area_details ?? []).filter(d => typeof d.score === 'number' && d.score > 0);
  if (scored.length) {
    items.push({ label: 'Impact area scores', detail: scored.map(d => `${d.label} ${d.score}`).join('; ') });
  }

  const gender = proposal.gender_split;
  if (gender && (typeof gender.women === 'number' || typeof gender.men === 'number')) {
    items.push({ label: 'Gender split', detail: `women ${gender.women ?? '—'}, men ${gender.men ?? '—'}` });
  }

  return items;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** `CustomizedAlertsFeService` injects `description` as HTML — every PT string is escaped first. */
export function escapePtHtml(text: string): string {
  return String(text ?? '').replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/** The post-create alert body: an escaped `<ul>` of the pending items. */
export function ptPendingChecklistHtml(items: PtPendingItem[]): string {
  const rows = items
    .map(item => `<li><strong>${escapePtHtml(item.label)}</strong>${item.detail ? ` — ${escapePtHtml(item.detail)}` : ''}</li>`)
    .join('');
  return `<p>Complete these in the result before submitting:</p><ul>${rows}</ul>`;
}
