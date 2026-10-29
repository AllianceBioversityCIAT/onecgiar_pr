import { PtCenterRefDto, PtGeoDto, PtProposalDto, isSafeHttpUrl } from './components/pt-results-browse/pt-results-browse.component';
import { PT_TEMPORARY_EVIDENCE_NOTICE } from '../../../../../../shared/constants/progress-tracker-evidence.constants';

/**
 * Progress Tracker prefill, Phase 1 + matched partners (2026-10-19, `PTB-R-18a` — amends
 * `PTB-R-18`, which kept the prefill to title / type / description).
 *
 * Pure helpers only: what the drawer may prefill (contribution, centers), what travels to the
 * server in `progress_tracker_prefill` (evidence links, matched partners and — `PTB-R-18b`,
 * 2026-10-19 — geography and impact-area scores), and what is left for the user as a "Pending from
 * Progress Tracker" checklist. Gender split and the type-specific blocks (innovation, policy
 * change, capacity sharing, people trained) are never applied.
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

/** PRMS geographic focus ids (`GeoScopeEnum`): Global, Regional, Country (one or many), Sub-national. */
export type PtPrefillGeoScopeId = 1 | 2 | 3 | 5;

/** `PTB-R-18b`: the geography a pick resolves to, already in PRMS terms. The server re-checks every id. */
export interface PtPrefillGeography {
  geo_scope_id: PtPrefillGeoScopeId;
  countries: { clarisa_id: number; iso_alpha_2: string | null; name: string }[];
  regions: { id: number; name: string }[];
  subnational: { code: string | null; clarisa_id: number | null }[];
}

export type PtImpactAreaKey = 'gender' | 'climate' | 'nutrition' | 'environment' | 'poverty';
export const PT_IMPACT_AREA_KEYS: readonly PtImpactAreaKey[] = ['gender', 'climate', 'nutrition', 'environment', 'poverty'];
export type PtImpactAreaScore = 0 | 1 | 2;

/** Body of `progress_tracker_prefill` on `POST results-framework-reporting/create`. */
export interface PtPrefillBlock {
  evidence_links: PtPrefillEvidenceLink[];
  partners: PtPrefillPartner[];
  /** Absent when nothing maps (unknown scope, policy `none`, no matched country…). */
  geography?: PtPrefillGeography;
  /** Absent when no tag has a usable score. */
  impact_areas?: Partial<Record<PtImpactAreaKey, PtImpactAreaScore>>;
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
const GEO_SCOPE_POLICY_KEYS = ['scope_level', 'geo_scope', 'geography'];
const GEO_COUNTRIES_POLICY_KEYS = ['countries'];
const GEO_REGIONS_POLICY_KEYS = ['regions'];

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
 * Names of the proposal's evidence items PT holds without an http(s) link (e.g. `kind: "text"`,
 * `access: "upload_file"`). Nothing can be saved for them — the user has to upload the file.
 */
export function ptEvidenceWithoutLink(proposal: PtProposalDto | null | undefined): string[] {
  const names = new Set<string>();
  for (const item of proposal?.evidence ?? []) {
    if (isSafeHttpUrl(item?.url)) continue;
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    if (name) names.add(name);
  }
  return [...names];
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

// ---------------------------------------------------------------------------------------------
// Geography (`PTB-R-18b`, 2026-10-19)
// ---------------------------------------------------------------------------------------------

export interface PtGeographyPlan {
  /** What travels in `progress_tracker_prefill.geography`; `null` = nothing is written. */
  geography: PtPrefillGeography | null;
  /** Written, but only as a suggestion (`suggest` policy, or PT's KPI default) → "review" item. */
  suggested: boolean;
  /** Checklist items for what is NOT covered by `geography`. */
  pending: PtPendingItem[];
}

type PtGeoLevel = 'global' | 'regional' | 'multinational' | 'national' | 'subnational' | 'unknown';

/** PT's `geo_scope.level`, normalized; anything unrecognised is `unknown`. */
export function ptGeoLevel(level: string | null | undefined): PtGeoLevel {
  const key = (level ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (key === 'global') return 'global';
  if (key === 'regional') return 'regional';
  if (key === 'multinational') return 'multinational';
  if (key === 'national' || key === 'country') return 'national';
  if (key === 'subnational') return 'subnational';
  return 'unknown';
}

/** PT's `["KPI"]`-only provenance = the KPI's planned countries, not confirmed by evidence. */
const isKpiDefault = (geo: PtGeoDto): boolean => {
  const provenance = (geo.provenance ?? []).map(p => p.trim().toUpperCase()).filter(Boolean);
  return provenance.length > 0 && provenance.every(p => p === 'KPI');
};

function geoSummary(geo: PtGeoDto): string {
  return [
    geo.level ? `scope ${geo.level}` : '',
    geo.countries.length ? `countries ${geo.countries.map(c => c.name).join(', ')}` : '',
    geo.regions.length ? `regions ${geo.regions.map(r => r.name).join(', ')}` : '',
    geo.subnational_areas ? `subnational ${geo.subnational_areas}` : ''
  ]
    .filter(Boolean)
    .join('; ');
}

/**
 * PT `geo_scope` → PRMS geographic focus, following PRMS's own Geographic location rules
 * (v2 `geographic-location/update/geographic/:id`; the client folds national + multinational into
 * one Country focus, `GeoScopeEnum.COUNTRY = 3`):
 *
 * | PT level | PRMS focus |
 * |---|---|
 * | `global` | 1 Global |
 * | `regional` | 2 Regional, with the regions PT sent with a CLARISA id (none → Regional + checklist) |
 * | `multinational` / `national` | 3 Country with the matched countries (none → nothing) |
 * | `sub-national` | 5 Sub-national with matched countries + areas carrying a CLARISA code/id; no such area → 3 Country + checklist; no country → nothing |
 * | `unknown` / empty / other | nothing (checklist) |
 *
 * Countries: `match_status = matched` with a positive `clarisa_id` only. Policy per piece —
 * `scope_level` (also `geo_scope` / `geography`), `countries`, `regions`: `none` drops the piece,
 * `suggest` fills it as a suggestion, `apply` / absent fills it. `scope_level = none` with
 * countries → the focus is derived from them (always 3 Country, any count). A `["KPI"]`-only
 * provenance is a suggestion too. The server writes it only into an empty geography.
 */
export function ptGeographyPlan(proposal: PtProposalDto | null | undefined): PtGeographyPlan {
  const none: PtGeographyPlan = { geography: null, suggested: false, pending: [] };
  const geo = proposal?.geo;
  if (!proposal || !geo) return none;

  const scopePolicy = ptFieldPolicy(proposal, ...GEO_SCOPE_POLICY_KEYS);
  const countriesPolicy = ptFieldPolicy(proposal, ...GEO_COUNTRIES_POLICY_KEYS);
  const regionsPolicy = ptFieldPolicy(proposal, ...GEO_REGIONS_POLICY_KEYS);
  const pending: PtPendingItem[] = [];

  const seen = new Set<number>();
  const matched: PtPrefillGeography['countries'] = [];
  const unmatched: string[] = [];
  for (const country of geo.countries) {
    const id = country.clarisa_id;
    if (country.match_status === 'matched' && typeof id === 'number' && Number.isInteger(id) && id > 0) {
      if (!seen.has(id)) matched.push({ clarisa_id: id, iso_alpha_2: country.iso_alpha_2, name: country.name });
      seen.add(id);
    } else {
      unmatched.push(country.name);
    }
  }
  const countries = countriesPolicy === 'none' ? [] : matched;
  const regions =
    regionsPolicy === 'none'
      ? []
      : geo.regions
          .filter(r => typeof r.clarisa_id === 'number' && r.clarisa_id > 0 && (r.match_status == null || r.match_status === 'matched'))
          .map(r => ({ id: r.clarisa_id as number, name: r.name }))
          .filter((r, i, all) => all.findIndex(x => x.id === r.id) === i);
  const subnational =
    countriesPolicy === 'none' ? [] : (geo.subnational_refs ?? []).map(ref => ({ code: ref.code, clarisa_id: ref.clarisa_id }));

  const level = ptGeoLevel(geo.level);
  let geography: PtPrefillGeography | null = null;
  const used: (PtFieldPolicy | null)[] = [];
  const make = (geo_scope_id: PtPrefillGeoScopeId, parts: Partial<PtPrefillGeography> = {}): PtPrefillGeography => ({
    geo_scope_id,
    countries: [],
    regions: [],
    subnational: [],
    ...parts
  });

  if (scopePolicy === 'none') {
    // Scope not to be applied, countries may be: derive the focus from them (1 or many → Country).
    if (countries.length) {
      geography = make(3, { countries });
      used.push(countriesPolicy);
    }
  } else if (level === 'global') {
    geography = make(1);
    used.push(scopePolicy);
  } else if (level === 'regional') {
    geography = make(2, { regions });
    used.push(scopePolicy, ...(regions.length ? [regionsPolicy] : []));
    if (!regions.length) {
      const names = geo.regions.map(r => r.name).join(', ');
      pending.push({ label: 'Regions', detail: names ? `Regional scope prefilled — choose the regions: ${names}` : 'Regional scope prefilled — choose the regions' });
    }
  } else if ((level === 'national' || level === 'multinational') && countries.length) {
    geography = make(3, { countries });
    used.push(scopePolicy, countriesPolicy);
  } else if (level === 'subnational' && countries.length) {
    geography = subnational.length ? make(5, { countries, subnational }) : make(3, { countries });
    used.push(scopePolicy, countriesPolicy);
    if (!subnational.length) {
      pending.push({
        label: 'Sub-national areas',
        detail: `Saved as Country — add the areas in Geographic location${geo.subnational_areas ? `: ${geo.subnational_areas}` : ''}`
      });
    }
  }

  const summary = geoSummary(geo);
  if (!geography) {
    if (summary && (scopePolicy !== 'none' || countriesPolicy !== 'none' || regionsPolicy !== 'none')) {
      pending.push({ label: 'Geographic location', detail: summary });
    }
    return { geography: null, suggested: false, pending };
  }

  if (countriesPolicy !== 'none' && (geography.geo_scope_id === 3 || geography.geo_scope_id === 5)) {
    for (const name of unmatched) pending.push({ label: `Country: ${name}`, detail: 'Not matched in CLARISA — add it in Geographic location' });
  }
  const suggested = used.includes('suggest') || isKpiDefault(geo);
  if (suggested) {
    pending.unshift({ label: 'Geographic location', detail: `Review the suggested geography (${isKpiDefault(geo) ? "the KPI's planned scope, not confirmed by evidence" : 'suggested by Progress Tracker'}): ${summary}` });
  }
  return { geography, suggested, pending };
}

// ---------------------------------------------------------------------------------------------
// Impact-area scores (`PTB-R-18b`, 2026-10-19)
// ---------------------------------------------------------------------------------------------

const IMPACT_AREA_SHORT_LABELS: Record<PtImpactAreaKey, string> = {
  gender: 'Gender equality, youth & social inclusion',
  climate: 'Climate adaptation & mitigation',
  nutrition: 'Nutrition, health & food security',
  environment: 'Environmental health & biodiversity',
  poverty: 'Poverty reduction, livelihoods & jobs'
};

/** Per-tag policy: `policy.impact_areas` may be one string for all tags or a `{ gender: 'apply', … }` map. */
export function ptImpactAreaPolicy(proposal: Pick<PtProposalDto, 'policy'> | null | undefined, key: PtImpactAreaKey): PtFieldPolicy | null {
  const raw = proposal?.policy?.['impact_areas'];
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>)[key] : raw;
  return value === 'apply' || value === 'suggest' || value === 'none' ? value : null;
}

const toScore = (value: unknown): PtImpactAreaScore | null => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return n === 0 || n === 1 || n === 2 ? n : null;
};

export interface PtImpactAreaPlan {
  scores: Partial<Record<PtImpactAreaKey, PtImpactAreaScore>>;
  suggested: PtImpactAreaKey[];
  pending: PtPendingItem[];
}

/**
 * The five tags from `impact_area_details[key].score` (fallback: the legacy flat `impact_areas`),
 * 0 Not targeted · 1 Significant · 2 Principal; any other value is skipped. Per-tag policy:
 * `none` drops the tag, `suggest` fills it and lists it for review, `apply` / absent fills it.
 * The server maps score → tag level id (score + 1) and never replaces a score already on the result.
 * Principal also needs its components and a tagged evidence in PRMS, so it stays in the checklist.
 */
export function ptImpactAreaPlan(proposal: PtProposalDto | null | undefined): PtImpactAreaPlan {
  const plan: PtImpactAreaPlan = { scores: {}, suggested: [], pending: [] };
  if (!proposal) return plan;
  const details = new Map((proposal.impact_area_details ?? []).map(d => [d.key, d]));
  for (const key of PT_IMPACT_AREA_KEYS) {
    const score = details.has(key) ? toScore(details.get(key)?.score) : toScore(proposal.impact_areas?.[key]);
    const policy = ptImpactAreaPolicy(proposal, key);
    if (score === null || policy === 'none') continue;
    plan.scores[key] = score;
    if (policy === 'suggest') plan.suggested.push(key);
    if (score === 2) {
      plan.pending.push({ label: `Impact area: ${IMPACT_AREA_SHORT_LABELS[key]}`, detail: 'Principal (2) — choose its component(s) and tag an evidence for it' });
    }
  }
  if (plan.suggested.length) {
    plan.pending.unshift({
      label: 'Impact area scores',
      detail: `Review the suggested scores: ${plan.suggested.map(k => `${IMPACT_AREA_SHORT_LABELS[k]} ${plan.scores[k]}`).join('; ')}`
    });
  }
  return plan;
}

/** `null` when there is nothing to send, so the key stays ABSENT from the create body. */
export function buildPtPrefillBlock(proposal: PtProposalDto | null | undefined): PtPrefillBlock | null {
  const evidence_links = ptEvidenceLinksToSave(proposal);
  const partners = ptMatchedPartners(proposal);
  const geography = ptGeographyPlan(proposal).geography;
  const impactAreas = ptImpactAreaPlan(proposal).scores;
  const hasScores = Object.keys(impactAreas).length > 0;
  if (!evidence_links.length && !partners.length && !geography && !hasScores) return null;
  return {
    evidence_links,
    partners,
    ...(geography ? { geography } : {}),
    ...(hasScores ? { impact_areas: impactAreas } : {})
  };
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
  // Links saved from PT are temporary (server prefixes their description); say so before creating.
  if (ptEvidenceLinksToSave(proposal).length) {
    items.push({ label: 'Temporary evidence', detail: PT_TEMPORARY_EVIDENCE_NOTICE });
  }
  if (evidencePolicy !== 'none') {
    for (const name of ptEvidenceWithoutLink(proposal)) {
      items.push({ label: `Evidence in Progress Tracker without a link: ${name}`, detail: 'upload the final file in Evidence' });
    }
  }

  // PTB-R-18b: only what the geography / impact-area plans did not apply, or applied as a suggestion.
  items.push(...ptGeographyPlan(proposal).pending, ...ptImpactAreaPlan(proposal).pending);

  const gender = proposal.gender_split;
  if (gender && (typeof gender.women === 'number' || typeof gender.men === 'number')) {
    items.push({ label: 'Gender split', detail: `women ${gender.women ?? '—'}, men ${gender.men ?? '—'}` });
  }

  return items;
}

const GEO_NOT_APPLIED: Record<string, string> = {
  not_empty: 'Not prefilled — the result already had a geography; compare it with the Progress Tracker one',
  no_valid_location: 'Not prefilled — no country was found in CLARISA; set it in Geographic location',
  failed: 'Could not be saved — set it in Geographic location'
};

/**
 * After create (`PTB-R-18b`): what the server did NOT apply from the geography / impact areas the
 * block carried (`response.progressTrackerPrefill`). A missing summary counts as not applied.
 */
export function ptPrefillOutcomeItems(sent: PtPrefillBlock | null | undefined, summary: Record<string, unknown> | null | undefined): PtPendingItem[] {
  const items: PtPendingItem[] = [];
  if (!sent) return items;
  if (sent.geography && typeof summary?.['geography_applied'] !== 'number') {
    const reason = typeof summary?.['geography_skipped_reason'] === 'string' ? summary['geography_skipped_reason'] : 'failed';
    items.push({ label: 'Geographic location', detail: GEO_NOT_APPLIED[reason] ?? GEO_NOT_APPLIED['failed'] });
  }
  const dropped = Array.isArray(summary?.['geography_skipped']) ? (summary['geography_skipped'] as unknown[]) : [];
  for (const name of dropped) {
    if (typeof name === 'string' && name.trim()) items.push({ label: `Location: ${name}`, detail: 'Not found in CLARISA — add it in Geographic location' });
  }
  const sentKeys = Object.keys(sent.impact_areas ?? {}) as PtImpactAreaKey[];
  const applied = new Set(Array.isArray(summary?.['impact_areas_applied']) ? (summary['impact_areas_applied'] as unknown[]) : []);
  const notApplied = sentKeys.filter(key => !applied.has(key));
  if (notApplied.length) {
    items.push({
      label: 'Impact area scores',
      detail: `Not prefilled (already scored, or not saved): ${notApplied.map(k => `${IMPACT_AREA_SHORT_LABELS[k]} ${sent.impact_areas?.[k]}`).join('; ')}`
    });
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
