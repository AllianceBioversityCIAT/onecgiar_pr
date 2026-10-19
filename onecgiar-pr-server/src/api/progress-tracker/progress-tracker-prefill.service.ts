import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Evidence } from '../results/evidences/entities/evidence.entity';
import { ResultsByInstitution } from '../results/results_by_institutions/entities/results_by_institution.entity';
import { InstitutionRoleEnum } from '../results/results_by_institutions/entities/institution_role.enum';
import { ClarisaInstitution } from '../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { REPORTING_EXCLUDED_INSTITUTION_IDS } from '../../clarisa/clarisa-reporting-exclusions.constant';
import { EvidenceTypeEnum } from '../../shared/constants/evidence-type.enum';
import { PtPrefillSummary } from './dto/pt-result-prefill.dto';

/** Main evidences a result shows in Evidence — mirrors the client cap (`PT_EVIDENCE_LINKS_MAX`). */
export const PT_PREFILL_MAX_EVIDENCE_LINKS = 6;
/** Generous upper bound so a malformed block cannot turn into a large insert. */
export const PT_PREFILL_MAX_PARTNERS = 30;

interface SanitizedPrefill {
  evidence_links: { url: string; title: string | null }[];
  partners: { clarisa_id: number; name: string }[];
}

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

    return { evidence_links, partners };
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

    return summary;
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
          description: l.title,
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
