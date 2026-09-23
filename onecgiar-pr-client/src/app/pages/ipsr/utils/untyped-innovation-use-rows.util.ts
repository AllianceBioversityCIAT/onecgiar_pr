/**
 * Night sweep 2026-09-23, IPSR-3 / IPSR-5 — rows the IPSR Step-1 / Step-3 writers would drop in silence.
 *
 * The server does have "The field actor type is required" / "... institution type ..." checks, but they
 * are `return`s inside `actors.forEach(async …)` (`innovation-pathway-step-one.service.ts` ~1034/1105,
 * `innovation-pathway-step-three.service.ts` ~481/573): the value is discarded, the row is skipped and
 * the save answers 200 (prtest 11172 / 12037). Same class as bilateral BIL-1 / BIL-1b, handled the same
 * way: the client refuses to save a row that carries data but no type. Truly blank rows (the placeholder
 * row the form pre-adds) are not flagged.
 */
import { IPSR_UNTYPED_ROWS_COPY } from '../../../internationalization/ipsr-untyped-rows.copy';

const filled = (value: unknown) => value !== null && value !== undefined && `${value}`.trim() !== '';
const hasType = (value: unknown) => filled(value);

export function actorMissingType(actor: any): boolean {
  if (!actor || actor.is_active === false || hasType(actor.actor_type_id)) return false;
  return [actor.women, actor.women_youth, actor.men, actor.men_youth, actor.how_many, actor.other_actor_type, actor.evidence_link].some(filled);
}

export function organizationMissingType(organization: any): boolean {
  if (!organization || organization.is_active === false) return false;
  if (hasType(organization.institution_types_id) || hasType(organization.institution_sub_type_id)) return false;
  return [organization.how_many, organization.other_institution, organization.graduate_students, organization.evidence_link].some(filled);
}

/** The message to show, or null when every row with data has its type. */
export function untypedInnovationUseRowsMessage(innovatonUse: { actors?: any[]; organization?: any[] } | null | undefined): string | null {
  const actors = (innovatonUse?.actors ?? []).filter(actorMissingType).length;
  const organizations = (innovatonUse?.organization ?? []).filter(organizationMissingType).length;
  if (!actors && !organizations) return null;
  const parts = [
    actors ? IPSR_UNTYPED_ROWS_COPY.actors(actors) : '',
    organizations ? IPSR_UNTYPED_ROWS_COPY.organizations(organizations) : ''
  ].filter(Boolean);
  return IPSR_UNTYPED_ROWS_COPY.message(parts);
}
