import { toNullableBoolean } from '../../../../../../../../../../shared/utils/nullable-boolean.util';
import {
  IpsrPrincipalImpactArea,
  IpsrStep3Body,
  IpsrStepThreeEvidence,
  Resultipresultcomplementary
} from '../../model/Ipsr-step-3-body.model';

/**
 * P2-3824 — pure helpers shared by the Step 3 page, the complementary innovations and the evidence
 * list, so the three read "how many", "which areas are missing" and "what is sent" the same way.
 */

/** Impact Area → the evidence flag that tags it. `climate` → `youth_related` is inherited from Results. */
export const IPSR_STEP3_IMPACT_AREA_FIELDS: Readonly<Record<IpsrPrincipalImpactArea, keyof IpsrStepThreeEvidence>> = {
  gender: 'gender_related',
  climate: 'youth_related',
  nutrition: 'nutrition_related',
  environment: 'environmental_biodiversity_related',
  poverty: 'poverty_related'
};

/** Order the alerts and the tag chips follow (the order of General information). */
export const IPSR_STEP3_IMPACT_AREAS: readonly IpsrPrincipalImpactArea[] = ['gender', 'climate', 'nutrition', 'environment', 'poverty'];

const TAG_FLAGS: readonly (keyof IpsrStepThreeEvidence)[] = [...Object.values(IPSR_STEP3_IMPACT_AREA_FIELDS), 'innovation_use_related'];

/** Legacy single-link columns the client no longer sends (the server dual-writes them). */
const LEGACY_FIELDS = ['readinees_evidence_link', 'readiness_details_of_evidence', 'use_evidence_link', 'use_details_of_evidence'] as const;
/** UI-only flags of the old checkbox + textarea, dropped with it. */
const UI_ONLY_FIELDS = ['showDetailsOfReadiness', 'showDetailsOfUseLevel'] as const;

/**
 * Coerces what the server returns into the shapes the dialog compares by identity: `is_sharepoint`
 * and the tags arrive as tinyint 1/0, `is_public_file` as boolean or tinyint. `null` stays `null`
 * for the public answer (unanswered is a real state), a missing list becomes `[]`.
 */
export function normalizeIpsrStep3Evidences(list: unknown): IpsrStepThreeEvidence[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => item && typeof item === 'object')
    .map((raw: any) => {
      const evidence: IpsrStepThreeEvidence = {
        ...raw,
        id: raw.id ?? null,
        link: raw.link ?? null,
        description: raw.description ?? null,
        is_sharepoint: toNullableBoolean(raw.is_sharepoint) === true,
        is_public_file: toNullableBoolean(raw.is_public_file)
      };
      TAG_FLAGS.forEach(flag => ((evidence as any)[flag] = toNullableBoolean(raw[flag]) === true));
      return evidence;
    });
}

/** Makes sure both lists of one component exist and are normalised. Mutates and returns the item. */
export function normalizeIpsrStep3Component<T extends Partial<Resultipresultcomplementary>>(item: T): T {
  if (!item) return item;
  item.readiness_evidences = normalizeIpsrStep3Evidences(item.readiness_evidences);
  item.use_evidences = normalizeIpsrStep3Evidences(item.use_evidences);
  return item;
}

/** Readiness + use together — the number the per-component cap is measured against. */
export function ipsrStep3ComponentEvidenceCount(item: Partial<Resultipresultcomplementary> | null | undefined): number {
  return (item?.readiness_evidences?.length ?? 0) + (item?.use_evidences?.length ?? 0);
}

/** Every evidence of the step: core and every complementary innovation, both levels. */
export function ipsrStep3AllEvidences(body: Partial<IpsrStep3Body> | null | undefined): IpsrStepThreeEvidence[] {
  const components = [body?.result_ip_result_core, ...(body?.result_ip_result_complementary ?? [])].filter(Boolean);
  return components.flatMap(item => [...(item.readiness_evidences ?? []), ...(item.use_evidences ?? [])]);
}

/**
 * Impact Areas scored 2 in General information that no evidence anywhere in the step is tagged with
 * yet — one alert each. Unknown area keys from the server are ignored rather than rendered blank.
 */
export function ipsrStep3MissingPrincipalImpactAreas(body: Partial<IpsrStep3Body> | null | undefined): IpsrPrincipalImpactArea[] {
  const principal = Array.isArray(body?.principal_impact_areas) ? body.principal_impact_areas : [];
  if (!principal.length) return [];
  const evidences = ipsrStep3AllEvidences(body);
  return IPSR_STEP3_IMPACT_AREAS.filter(area => principal.includes(area)).filter(
    area => !evidences.some(evidence => Boolean(evidence?.[IPSR_STEP3_IMPACT_AREA_FIELDS[area]]))
  );
}

/**
 * What travels in the PATCH for one evidence: no `File`, no upload progress, and no `legacy` flag —
 * a legacy item (id null) goes back as a normal new item, which is what persists it as a row.
 */
export function toIpsrStep3EvidencePayload(evidence: IpsrStepThreeEvidence): IpsrStepThreeEvidence {
  const { file, percentage, legacy, ...rest } = evidence;
  return rest;
}

function toComponentPayload<T extends Partial<Resultipresultcomplementary>>(item: T): T {
  if (!item) return item;
  const payload: any = { ...item };
  [...LEGACY_FIELDS, ...UI_ONLY_FIELDS].forEach(field => delete payload[field]);
  payload.readiness_evidences = (item.readiness_evidences ?? []).map(toIpsrStep3EvidencePayload);
  payload.use_evidences = (item.use_evidences ?? []).map(toIpsrStep3EvidencePayload);
  return payload;
}

/**
 * The Step 3 PATCH body: the evidence arrays on core and every complementary item, WITHOUT the four
 * legacy single-link fields (the server owns them now) and without the read-only
 * `principal_impact_areas`. Never mutates the body on screen.
 */
export function buildIpsrStep3SavePayload(body: IpsrStep3Body): IpsrStep3Body {
  const payload: any = {
    ...body,
    result_ip_result_core: toComponentPayload(body.result_ip_result_core),
    result_ip_result_complementary: (body.result_ip_result_complementary ?? []).map(toComponentPayload)
  };
  delete payload.principal_impact_areas;
  return payload;
}

/** Same URL rule the Results evidence form applies. */
export function isValidIpsrStep3EvidenceLink(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}(:[0-9]{1,5})?(\/\S*)?$/i.test(value.trim());
}

/** Same file-storage rule as Results: a warning, not a blocker. */
export function isCloudStorageLink(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i.test(
    value.trim()
  );
}

export function countWords(value: string | null | undefined): number {
  const text = value?.trim();
  return text ? text.split(/\s+/).length : 0;
}
