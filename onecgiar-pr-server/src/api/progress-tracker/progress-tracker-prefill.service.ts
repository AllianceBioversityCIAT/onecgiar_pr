import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Evidence } from '../results/evidences/entities/evidence.entity';
import { ResultsByInstitution } from '../results/results_by_institutions/entities/results_by_institution.entity';
import { InstitutionRoleEnum } from '../results/results_by_institutions/entities/institution_role.enum';
import { ClarisaInstitution } from '../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { REPORTING_EXCLUDED_INSTITUTION_IDS } from '../../clarisa/clarisa-reporting-exclusions.constant';
import { EvidenceTypeEnum } from '../../shared/constants/evidence-type.enum';
import { PtImpactAreaKey, PtPrefillSummary } from './dto/pt-result-prefill.dto';
import { Result } from '../results/entities/result.entity';
import { ResultCountry } from '../results/result-countries/entities/result-country.entity';
import { ResultRegion } from '../results/result-regions/entities/result-region.entity';
import { ClarisaCountry } from '../../clarisa/clarisa-countries/entities/clarisa-country.entity';
import { ClarisaRegion } from '../../clarisa/clarisa-regions/entities/clarisa-region.entity';
import { ClarisaSubnationalScope } from '../../clarisa/clarisa-subnational-scope/entities/clarisa-subnational-scope.entity';
import { GeographicLocationService } from '../results-framework-reporting/geographic-location/geographic-location.service';
import { CreateGeographicLocationDto } from '../results-framework-reporting/geographic-location/dto/create-geographic-location.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

/** Main evidences a result shows in Evidence — mirrors the client cap (`PT_EVIDENCE_LINKS_MAX`). */
export const PT_PREFILL_MAX_EVIDENCE_LINKS = 6;
/**
 * Prefixed to the description of every evidence saved from a Progress Tracker pick. The evidence
 * table has no provenance column (no migration for this), so the prefix is the marker: the client
 * Evidence section reads it to show the "temporary" notice.
 */
export const PT_TEMPORARY_EVIDENCE_PREFIX =
  '[Temporary — from Progress Tracker, may be incomplete]';
/** Generous upper bound so a malformed block cannot turn into a large insert. */
export const PT_PREFILL_MAX_PARTNERS = 30;
/** Same reasoning for geography: no real result spans more countries / regions / areas. */
export const PT_PREFILL_MAX_GEO_ITEMS = 60;

/** PRMS geographic focus ids a pick may write: Global, Regional, Country, Sub-national. */
export const PT_PREFILL_GEO_SCOPES = [1, 2, 3, 5] as const;

/**
 * `PTB-R-18b` — PT impact-area key → the `result` column of the Impact Area scores section.
 * The column holds a `gender_tag_level` id: 1 `(0) Not targeted`, 2 `(1) Significant`,
 * 3 `(2) Principal` (`1666187001104-genderTagData.ts`; the client's `TAG_LEVELS`), so id = score + 1.
 */
export const PT_IMPACT_AREA_COLUMNS: Record<PtImpactAreaKey, keyof Result> = {
  gender: 'gender_tag_level_id',
  climate: 'climate_change_tag_level_id',
  nutrition: 'nutrition_tag_level_id',
  environment: 'environmental_biodiversity_tag_level_id',
  poverty: 'poverty_tag_level_id',
};
const PT_IMPACT_AREA_KEYS = Object.keys(
  PT_IMPACT_AREA_COLUMNS,
) as PtImpactAreaKey[];

interface SanitizedGeography {
  geo_scope_id: (typeof PT_PREFILL_GEO_SCOPES)[number];
  countries: { clarisa_id: number; iso_alpha_2: string | null; name: string }[];
  regions: { id: number; name: string }[];
  subnational: { code: string | null; clarisa_id: number | null }[];
}

interface SanitizedPrefill {
  evidence_links: { url: string; title: string | null }[];
  partners: { clarisa_id: number; name: string }[];
  geography: SanitizedGeography | null;
  impact_areas: Partial<Record<PtImpactAreaKey, 0 | 1 | 2>>;
}

const positiveInt = (value: unknown): number | null => {
  const id = Number(value);
  return value !== null && value !== '' && Number.isInteger(id) && id > 0
    ? id
    : null;
};
const asRec = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * `PTB-R-18a` (2026-10-19, amends `PTB-R-18`) — applies a Progress Tracker pick's evidence links
 * and CLARISA-matched partners to a result that was just created through
 * `POST results-framework-reporting/create`.
 *
 * 🛑 Best-effort by contract: it never throws. The result already exists when this runs and the
 * create handler is not transactional, so a failure here is logged as a warning and reported back
 * in the summary (`partners_skipped`) — never a failed create. Each block runs on its own.
 *
 * - Evidence links: http(s) only, deduped, capped; saved as MAIN evidences with no file.
 * - Partners: the CLARISA id must exist, be active, be reportable and not be a CGIAR center (those
 *   go through the centers field). Saved with the role the partners form reads
 *   (`PARTNER`, or `KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS` for a knowledge product), no delivery
 *   type (no PT-role → delivery-type catalogue exists), `is_predicted = true` as provenance.
 *   `no_applicable_partner` and `is_lead_by_partner` are never touched.
 * - Geography (`PTB-R-18b`): the focus the client mapped (1 | 2 | 3 | 5) with countries / regions /
 *   subnational areas re-validated against CLARISA, saved through
 *   `GeographicLocationService.saveGeoScopeV2` (the v2 Geographic location save) — only when the
 *   result has no geography yet. Unknown ids are dropped; a Country focus left with no country is
 *   not written; a Sub-national focus left with no area falls back to Country.
 * - Impact areas (`PTB-R-18b`): score 0 / 1 / 2 → `gender_tag_level` id 1 / 2 / 3 on the five
 *   `*_tag_level_id` columns, each only when still `NULL`. Components and justification are not
 *   written (no PT → component mapping; PRMS has no justification field).
 */
@Injectable()
export class ProgressTrackerPrefillService {
  private readonly logger = new Logger(ProgressTrackerPrefillService.name);

  constructor(
    @InjectRepository(Evidence)
    private readonly _evidenceRepository: Repository<Evidence>,
    @InjectRepository(ResultsByInstitution)
    private readonly _resultByInstitutionRepository: Repository<ResultsByInstitution>,
    @InjectRepository(ClarisaInstitution)
    private readonly _clarisaInstitutionRepository: Repository<ClarisaInstitution>,
    @InjectRepository(Result)
    private readonly _resultRepository: Repository<Result>,
    @InjectRepository(ResultCountry)
    private readonly _resultCountryRepository: Repository<ResultCountry>,
    @InjectRepository(ResultRegion)
    private readonly _resultRegionRepository: Repository<ResultRegion>,
    @InjectRepository(ClarisaCountry)
    private readonly _clarisaCountryRepository: Repository<ClarisaCountry>,
    @InjectRepository(ClarisaRegion)
    private readonly _clarisaRegionRepository: Repository<ClarisaRegion>,
    @InjectRepository(ClarisaSubnationalScope)
    private readonly _clarisaSubnationalRepository: Repository<ClarisaSubnationalScope>,
    // `GeographicLocationService` lives in `GeographicLocationModule`, which pulls in the whole
    // `ResultsModule`; it is resolved lazily (non-strict) instead of importing that graph here.
    private readonly _moduleRef: ModuleRef,
  ) {}

  /** Lenient projection of the raw block: anything unexpected is dropped, never rejected. */
  static sanitize(block: unknown): SanitizedPrefill {
    const rec =
      block && typeof block === 'object' && !Array.isArray(block)
        ? (block as Record<string, unknown>)
        : {};

    const seenUrls = new Set<string>();
    const evidence_links: SanitizedPrefill['evidence_links'] = [];
    for (const raw of Array.isArray(rec.evidence_links)
      ? rec.evidence_links
      : []) {
      const url = ProgressTrackerPrefillService.httpUrl(
        (raw as Record<string, unknown>)?.url,
      );
      if (!url) continue;
      const key = url.replace(/\/+$/, '').toLowerCase();
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);
      const title = (raw as Record<string, unknown>)?.title;
      evidence_links.push({
        url,
        title: typeof title === 'string' && title.trim() ? title.trim() : null,
      });
      if (evidence_links.length === PT_PREFILL_MAX_EVIDENCE_LINKS) break;
    }

    const seenIds = new Set<number>();
    const partners: SanitizedPrefill['partners'] = [];
    for (const raw of Array.isArray(rec.partners) ? rec.partners : []) {
      const id = Number((raw as Record<string, unknown>)?.clarisa_id);
      if (!Number.isInteger(id) || id <= 0 || seenIds.has(id)) continue;
      seenIds.add(id);
      const name = (raw as Record<string, unknown>)?.name;
      partners.push({
        clarisa_id: id,
        name: typeof name === 'string' && name.trim() ? name.trim() : `#${id}`,
      });
      if (partners.length === PT_PREFILL_MAX_PARTNERS) break;
    }

    return {
      evidence_links,
      partners,
      geography: ProgressTrackerPrefillService.sanitizeGeography(rec.geography),
      impact_areas: ProgressTrackerPrefillService.sanitizeImpactAreas(
        rec.impact_areas,
      ),
    };
  }

  private static sanitizeGeography(raw: unknown): SanitizedGeography | null {
    const rec = asRec(raw);
    const scope = Number(rec.geo_scope_id);
    if (!(PT_PREFILL_GEO_SCOPES as readonly number[]).includes(scope)) {
      return null;
    }
    const list = (value: unknown): unknown[] =>
      (Array.isArray(value) ? value : []).slice(0, PT_PREFILL_MAX_GEO_ITEMS);

    const seenCountries = new Set<number>();
    const countries: SanitizedGeography['countries'] = [];
    for (const item of list(rec.countries)) {
      const c = asRec(item);
      const id = positiveInt(c.clarisa_id);
      if (!id || seenCountries.has(id)) continue;
      seenCountries.add(id);
      const iso = text(c.iso_alpha_2).toUpperCase();
      countries.push({
        clarisa_id: id,
        iso_alpha_2: iso || null,
        name: text(c.name) || `#${id}`,
      });
    }

    const seenRegions = new Set<number>();
    const regions: SanitizedGeography['regions'] = [];
    for (const item of list(rec.regions)) {
      const r = asRec(item);
      const id = positiveInt(r.id);
      if (!id || seenRegions.has(id)) continue;
      seenRegions.add(id);
      regions.push({ id, name: text(r.name) || `#${id}` });
    }

    const subnational: SanitizedGeography['subnational'] = [];
    for (const item of list(rec.subnational)) {
      const a = asRec(item);
      const code = text(a.code) || null;
      const clarisa_id = positiveInt(a.clarisa_id);
      if (code || clarisa_id) subnational.push({ code, clarisa_id });
    }

    return {
      geo_scope_id: scope as SanitizedGeography['geo_scope_id'],
      countries,
      regions,
      subnational,
    };
  }

  private static sanitizeImpactAreas(
    raw: unknown,
  ): SanitizedPrefill['impact_areas'] {
    const rec = asRec(raw);
    const out: SanitizedPrefill['impact_areas'] = {};
    for (const key of PT_IMPACT_AREA_KEYS) {
      const score = rec[key];
      if (score === 0 || score === 1 || score === 2) out[key] = score;
    }
    return out;
  }

  async apply(
    resultId: number,
    block: unknown,
    userId: number,
    isKnowledgeProduct: boolean,
  ): Promise<PtPrefillSummary> {
    const prefill = ProgressTrackerPrefillService.sanitize(block);
    const summary: PtPrefillSummary = {
      evidence_links_saved: 0,
      partners_saved: 0,
      partners_skipped: [],
      geography_applied: null,
      geography_skipped_reason: null,
      geography_skipped: [],
      impact_areas_applied: [],
      impact_areas_skipped: [],
    };

    try {
      summary.evidence_links_saved = await this.saveEvidenceLinks(
        resultId,
        prefill.evidence_links,
        userId,
      );
    } catch (error) {
      this.logger.warn(
        `pt.prefill.evidence_failed result=${resultId}: ${ProgressTrackerPrefillService.reason(error)}`,
      );
    }

    try {
      const { saved, skipped } = await this.savePartners(
        resultId,
        prefill.partners,
        userId,
        isKnowledgeProduct,
      );
      summary.partners_saved = saved;
      summary.partners_skipped = skipped;
    } catch (error) {
      summary.partners_skipped = prefill.partners.map((p) => p.name);
      this.logger.warn(
        `pt.prefill.partners_failed result=${resultId}: ${ProgressTrackerPrefillService.reason(error)}`,
      );
    }

    if (prefill.geography) {
      try {
        const geo = await this.saveGeography(
          resultId,
          prefill.geography,
          userId,
        );
        summary.geography_applied = geo.applied;
        summary.geography_skipped_reason = geo.reason;
        summary.geography_skipped = geo.skipped;
      } catch (error) {
        summary.geography_skipped_reason = 'failed';
        this.logger.warn(
          `pt.prefill.geography_failed result=${resultId}: ${ProgressTrackerPrefillService.reason(error)}`,
        );
      }
    }

    const scored = Object.keys(prefill.impact_areas) as PtImpactAreaKey[];
    if (scored.length) {
      try {
        const ia = await this.saveImpactAreas(
          resultId,
          prefill.impact_areas,
          userId,
        );
        summary.impact_areas_applied = ia.applied;
        summary.impact_areas_skipped = ia.skipped;
      } catch (error) {
        summary.impact_areas_skipped = scored;
        this.logger.warn(
          `pt.prefill.impact_areas_failed result=${resultId}: ${ProgressTrackerPrefillService.reason(error)}`,
        );
      }
    }

    return summary;
  }

  /**
   * Never overwrites: a result that already has a focus or any active country / region keeps it.
   * Every id is checked against CLARISA; what survives is saved through the v2 Geographic location
   * save so the result ends up exactly as if the user had saved that section.
   */
  private async saveGeography(
    resultId: number,
    geo: SanitizedGeography,
    userId: number,
  ): Promise<{
    applied: number | null;
    reason: string | null;
    skipped: string[];
  }> {
    const result = await this._resultRepository.findOne({
      where: { id: resultId },
      select: ['id', 'geographic_scope_id'],
    });
    const [countryRows, regionRows] = await Promise.all([
      this._resultCountryRepository.count({
        where: { result_id: resultId, is_active: true },
      }),
      this._resultRegionRepository.count({
        where: { result_id: resultId, is_active: true },
      }),
    ]);
    if (!result || result.geographic_scope_id || countryRows || regionRows) {
      return { applied: null, reason: 'not_empty', skipped: [] };
    }

    const skipped: string[] = [];

    const known = geo.countries.length
      ? await this._clarisaCountryRepository.find({
          where: { id: In(geo.countries.map((c) => c.clarisa_id)) },
          select: ['id', 'iso_alpha_2'],
        })
      : [];
    const isoById = new Map(
      known.map((c) => [c.id, (c.iso_alpha_2 ?? '').toUpperCase()]),
    );
    const countries = geo.countries.filter((c) => {
      const ok =
        isoById.has(c.clarisa_id) &&
        (!c.iso_alpha_2 || isoById.get(c.clarisa_id) === c.iso_alpha_2);
      if (!ok) skipped.push(c.name);
      return ok;
    });

    let regions: SanitizedGeography['regions'] = [];
    if (geo.geo_scope_id === 2 && geo.regions.length) {
      const knownRegions = new Set(
        (
          await this._clarisaRegionRepository.find({
            where: { um49Code: In(geo.regions.map((r) => r.id)) },
            select: ['um49Code'],
          })
        ).map((r) => r.um49Code),
      );
      regions = geo.regions.filter((r) => {
        if (!knownRegions.has(r.id)) skipped.push(r.name);
        return knownRegions.has(r.id);
      });
    }

    const subnationalByCountry = new Map<number, { code: string }[]>();
    if (geo.geo_scope_id === 5 && geo.subnational.length && countries.length) {
      const codes = geo.subnational.map((a) => a.code).filter(Boolean);
      const ids = geo.subnational.map((a) => a.clarisa_id).filter(Boolean);
      const where = [
        ...(codes.length ? [{ code: In(codes) }] : []),
        ...(ids.length ? [{ id: In(ids) }] : []),
      ];
      const areas = await this._clarisaSubnationalRepository.find({
        where,
        select: ['id', 'code', 'country_id'],
      });
      const countryIds = new Set(countries.map((c) => c.clarisa_id));
      for (const ref of geo.subnational) {
        const area = areas.find(
          (a) =>
            (ref.code && a.code === ref.code) ||
            (ref.clarisa_id && Number(a.id) === ref.clarisa_id),
        );
        const countryId = area ? Number(area.country_id) : null;
        if (!area || !countryIds.has(countryId)) {
          skipped.push(ref.code ?? `#${ref.clarisa_id}`);
          continue;
        }
        const list = subnationalByCountry.get(countryId) ?? [];
        if (!list.some((a) => a.code === area.code))
          list.push({ code: area.code });
        subnationalByCountry.set(countryId, list);
      }
    }

    let scope: number = geo.geo_scope_id;
    if ((scope === 3 || scope === 5) && !countries.length) {
      if (skipped.length) {
        this.logger.warn(
          `pt.prefill.geography_skipped result=${resultId} count=${skipped.length}`,
        );
      }
      return { applied: null, reason: 'no_valid_location', skipped };
    }
    if (scope === 5 && !subnationalByCountry.size) scope = 3;

    const dto: CreateGeographicLocationDto = {
      result_id: resultId,
      geo_scope_id: scope,
      has_countries: scope === 3 || scope === 5,
      has_regions: scope === 2 && regions.length > 0,
      regions: scope === 2 ? regions.map((r) => ({ id: r.id })) : [],
      countries:
        scope === 3 || scope === 5
          ? countries.map((c) => ({
              id: c.clarisa_id,
              ...(scope === 5
                ? { sub_national: subnationalByCountry.get(c.clarisa_id) ?? [] }
                : {}),
            }))
          : [],
      extra_geo_scope_id: null,
      has_extra_countries: false,
      has_extra_regions: false,
      extra_regions: [],
      extra_countries: [],
    };

    const geographicLocation = this._moduleRef.get(GeographicLocationService, {
      strict: false,
    });
    const saved = await geographicLocation.saveGeoScopeV2(dto, {
      id: userId,
    } as TokenDto);
    if (skipped.length) {
      this.logger.warn(
        `pt.prefill.geography_skipped result=${resultId} count=${skipped.length}`,
      );
    }
    if ((saved as { status?: number })?.status !== HttpStatus.OK) {
      this.logger.warn(
        `pt.prefill.geography_failed result=${resultId}: save answered ${(saved as { status?: number })?.status}`,
      );
      return { applied: null, reason: 'failed', skipped };
    }
    return { applied: scope, reason: null, skipped };
  }

  /** Only columns still `NULL` are written; a score the user already set is never replaced. */
  private async saveImpactAreas(
    resultId: number,
    scores: SanitizedPrefill['impact_areas'],
    userId: number,
  ): Promise<{ applied: PtImpactAreaKey[]; skipped: PtImpactAreaKey[] }> {
    const keys = Object.keys(scores) as PtImpactAreaKey[];
    const columns = keys.map((k) => PT_IMPACT_AREA_COLUMNS[k]);
    const result = await this._resultRepository.findOne({
      where: { id: resultId },
      select: ['id', ...columns],
    });
    if (!result) return { applied: [], skipped: keys };

    const patch: Partial<Result> = {};
    const applied: PtImpactAreaKey[] = [];
    const skipped: PtImpactAreaKey[] = [];
    for (const key of keys) {
      const column = PT_IMPACT_AREA_COLUMNS[key];
      if (result[column] != null) {
        skipped.push(key);
        continue;
      }
      (patch as Record<string, unknown>)[column] = scores[key] + 1;
      applied.push(key);
    }
    if (applied.length) {
      await this._resultRepository.update(resultId, {
        ...patch,
        last_updated_by: userId,
      });
    }
    return { applied, skipped };
  }

  private async saveEvidenceLinks(
    resultId: number,
    links: SanitizedPrefill['evidence_links'],
    userId: number,
  ): Promise<number> {
    if (!links.length) return 0;
    const existing = await this._evidenceRepository.find({
      where: {
        result_id: resultId,
        is_active: 1,
        evidence_type_id: EvidenceTypeEnum.MAIN,
      },
      select: ['id', 'link'],
    });
    const known = new Set(
      existing.map((e) => (e.link ?? '').replace(/\/+$/, '').toLowerCase()),
    );
    const room = Math.max(PT_PREFILL_MAX_EVIDENCE_LINKS - existing.length, 0);
    const rows = links
      .filter((l) => !known.has(l.url.replace(/\/+$/, '').toLowerCase()))
      .slice(0, room)
      .map((l) =>
        this._evidenceRepository.create({
          link: l.url,
          description: l.title
            ? `${PT_TEMPORARY_EVIDENCE_PREFIX} ${l.title}`
            : PT_TEMPORARY_EVIDENCE_PREFIX,
          result_id: resultId,
          evidence_type_id: EvidenceTypeEnum.MAIN,
          is_supplementary: false,
          is_sharepoint: 0,
          is_active: 1,
          created_by: userId,
          last_updated_by: userId,
        }),
      );
    if (!rows.length) return 0;
    await this._evidenceRepository.save(rows);
    return rows.length;
  }

  private async savePartners(
    resultId: number,
    partners: SanitizedPrefill['partners'],
    userId: number,
    isKnowledgeProduct: boolean,
  ): Promise<{ saved: number; skipped: string[] }> {
    if (!partners.length) return { saved: 0, skipped: [] };

    const ids = partners.map((p) => p.clarisa_id);
    const institutions = await this._clarisaInstitutionRepository.find({
      where: { id: In(ids) },
      relations: { clarisa_center: true },
    });
    const valid = new Set(
      institutions
        .filter(
          (i) =>
            i.is_active !== false &&
            !i.clarisa_center &&
            !(REPORTING_EXCLUDED_INSTITUTION_IDS as readonly number[]).includes(
              i.id,
            ),
        )
        .map((i) => i.id),
    );

    const roleId = isKnowledgeProduct
      ? InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS
      : InstitutionRoleEnum.PARTNER;
    const already = new Set(
      (
        await this._resultByInstitutionRepository.find({
          where: {
            result_id: resultId,
            institution_roles_id: roleId,
            is_active: true,
          },
          select: ['id', 'institutions_id'],
        })
      ).map((r) => r.institutions_id),
    );

    const skipped = partners
      .filter((p) => !valid.has(p.clarisa_id))
      .map((p) => p.name);
    const rows = partners
      .filter((p) => valid.has(p.clarisa_id) && !already.has(p.clarisa_id))
      .map((p) =>
        this._resultByInstitutionRepository.create({
          result_id: resultId,
          institutions_id: p.clarisa_id,
          institution_roles_id: roleId,
          is_predicted: true,
          from_toc: false,
          is_active: true,
          created_by: userId,
          last_updated_by: userId,
        }),
      );
    if (skipped.length) {
      this.logger.warn(
        `pt.prefill.partners_skipped result=${resultId} count=${skipped.length}`,
      );
    }
    if (rows.length) await this._resultByInstitutionRepository.save(rows);
    return { saved: rows.length, skipped };
  }

  private static httpUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? value.trim()
        : null;
    } catch {
      return null;
    }
  }

  private static reason(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
