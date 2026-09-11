import { Injectable, Logger } from '@nestjs/common';
import { In } from 'typeorm';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsByProjectsRepository } from '../results_by_projects/results_by_projects.repository';
import { InvestmentRowDto } from './dto/investment-row.dto';
import { NonPooledProjectBudgetRepository } from './repositories/non_pooled_proyect_budget.repository';
import { ResultInitiativeBudgetRepository } from './repositories/result_initiative_budget.repository';
import { ResultInstitutionsBudgetRepository } from './repositories/result_institutions_budget.repository';

/**
 * The three "Investment (USD)" blocks of a result — CGIAR programmes
 * (`result_initiative_budget`), W3/bilateral projects (`non_pooled_projetct_budget`) and partner
 * co-investment (`result_institutions_budget`) — for the legacy `summary/*` endpoints that the
 * bilateral centre form rides on (P2-3390).
 *
 * WHY A LEAF SERVICE. Equivalent methods already exist on `InnovationUseService`
 * (`results-framework-reporting/innovation-use`), but `InnovationUseModule` imports
 * `SummaryModule`, so importing it back would close a module cycle whose only workaround is an
 * `@Optional() @Inject(forwardRef(...))` — and an optional injection that resolves to undefined
 * means investment silently stops saving, the exact failure this story removes. This class depends
 * on repositories only, so any module can provide it. Making the v2 service delegate here (and
 * deleting the duplication) is a follow-up: it would change W1/W2 P25 and IPSR in the same PR.
 *
 * WHY IT IS NOT A COPY. Two things differ from the v2 methods, on purpose, because the bilateral
 * form behaves differently from the W1/W2 page:
 *
 *  1. **The reads are link-driven, not budget-row-driven.** The v2 readers start from the budget
 *     rows, and a bilateral result has none: `bilateral-center.service.ts` creates the role-1
 *     initiative link and the partner links without their companion budget rows (unlike
 *     `results.service.ts:501` and `share-result-request.service.ts:1243`, which create both for
 *     W1/W2). Starting from the budget table would render three permanently empty tables. Here one
 *     row is emitted per ACTIVE link with a null amount until somebody types one, and the write
 *     creates the budget row — so a GET never writes.
 *  2. **An unresolvable row is logged and skipped, never thrown.** These endpoints back an
 *     800 ms-debounced autosave; one stale row must not abort the whole save.
 *
 * ⚠️ Bilateral project rows are keyed by `result_project_id` (`results_by_projects`) and their
 * legacy `non_pooled_projetct_id` is forced to null. The legacy writer in
 * `summary/innovation_dev.service.ts` resolves the `non_pooled_project` catalogue instead, finds
 * nothing for a CLARISA project and drops the row in silence — which is why bilateral sends only
 * the flat `investment_*` keys and never the legacy `*_expected_investment` ones.
 */
@Injectable()
export class ResultInvestmentService {
  private readonly logger = new Logger(ResultInvestmentService.name);

  constructor(
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultByProjectRepository: ResultsByProjectsRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
  ) {}

  /** `decimal` columns come back as strings; the table wants numbers or null. */
  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
  }

  /**
   * "This is yet to be determined" and an amount are mutually exclusive, so ticking the checkbox
   * clears the amount. Same rule as `saveInitiativeInvestment` / `saveBillateralInvestment` in v2.
   */
  private amountToSave(row: InvestmentRowDto): number | null {
    if (row.is_determined === true) return null;
    return this.toNumberOrNull(row.kind_cash);
  }

  /**
   * A row that says nothing — no amount and no "yet to be determined" — creates NO budget row.
   *
   * ⚠️ This is what keeps the legacy endpoint safe for the pooled-funding P22 Innovation Use section,
   * which shares it: that form sends the three arrays back exactly as it read them (its own tables render
   * for P25 only, and P25 saves through the v2 endpoint). Without this guard, merely opening and saving a
   * P22 result would seed an empty `kind_cash: null` row for every active link — rows the legacy,
   * budget-row-driven readers would then show as new lines in other sections. An existing row is still
   * updated, so clearing an amount back to empty persists.
   */
  private isEmptyRow(row: InvestmentRowDto, amount: number | null): boolean {
    return amount === null && (row.is_determined ?? null) === null;
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  /** One row per active initiative link, carrying its amount when one was already saved. */
  async getInvestmentPrograms(resultId: number): Promise<InvestmentRowDto[]> {
    const initiatives = await this._resultByInitiativeRepository.find({
      where: { result_id: resultId, is_active: true },
      relations: { obj_initiative: true },
    });
    if (!initiatives.length) return [];

    const budgets = await this._resultInitiativesBudgetRepository.find({
      where: {
        result_initiative_id: In(initiatives.map((el) => el.id)),
        is_active: true,
      },
    });
    const budgetByLink = new Map(
      budgets.map((el) => [Number(el.result_initiative_id), el]),
    );

    return initiatives.map((initiative) => {
      const budget = budgetByLink.get(Number(initiative.id));
      return {
        id: initiative.obj_initiative?.id ?? null,
        kind_cash: this.toNumberOrNull(budget?.kind_cash),
        is_determined: budget?.is_determined ?? null,
        official_code: initiative.obj_initiative?.official_code ?? null,
        name: initiative.obj_initiative?.name ?? null,
      } as InvestmentRowDto;
    });
  }

  /** One row per active W3/bilateral project link. */
  async getInvestmentBilateral(resultId: number): Promise<InvestmentRowDto[]> {
    const projects = await this._resultByProjectRepository.find({
      where: { result_id: resultId, is_active: true },
      relations: { obj_clarisa_project: true },
    });
    if (!projects.length) return [];

    const budgets = await this._resultBilateralBudgetRepository.find({
      where: {
        result_project_id: In(projects.map((el) => el.id)),
        is_active: true,
      },
    });
    const budgetByLink = new Map(
      budgets.map((el) => [Number(el.result_project_id), el]),
    );

    return projects.map((project) => {
      const budget = budgetByLink.get(Number(project.id));
      const clarisaProject = project.obj_clarisa_project;
      return {
        id: clarisaProject?.id ?? null,
        project_id: clarisaProject?.id ?? null,
        non_pooled_projetct_budget_id:
          budget?.non_pooled_projetct_budget_id ?? null,
        kind_cash: this.toNumberOrNull(budget?.kind_cash),
        is_determined: budget?.is_determined ?? null,
        official_code: null,
        name: clarisaProject?.shortName ?? clarisaProject?.fullName ?? null,
      } as InvestmentRowDto;
    });
  }

  /** One row per active partner-institution link. */
  async getInvestmentPartners(resultId: number): Promise<InvestmentRowDto[]> {
    const institutions = await this._resultByIntitutionsRepository.find({
      where: { result_id: resultId, is_active: true },
      relations: { obj_institutions: true },
    });
    if (!institutions.length) return [];

    const budgets = await this._resultInstitutionsBudgetRepository.find({
      where: {
        result_institution_id: In(institutions.map((el) => el.id)),
        is_active: true,
      },
    });
    const budgetByLink = new Map(
      budgets.map((el) => [Number(el.result_institution_id), el]),
    );

    return institutions.map((institution) => {
      const budget = budgetByLink.get(Number(institution.id));
      return {
        id: institution.obj_institutions?.id ?? null,
        kind_cash: this.toNumberOrNull(budget?.kind_cash),
        is_determined: budget?.is_determined ?? null,
        official_code: institution.obj_institutions?.acronym ?? null,
        name: institution.obj_institutions?.name ?? null,
      } as InvestmentRowDto;
    });
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Upserts one budget row per incoming initiative row. An absent or empty array is a no-op: the
   * section save only sends what the form holds, so "nothing sent" must never delete amounts.
   */
  async saveInvestmentPrograms(
    resultId: number,
    userId: number,
    rows?: InvestmentRowDto[],
  ): Promise<void> {
    if (!Array.isArray(rows) || !rows.length) return;

    for (const row of rows) {
      const link = await this._resultByInitiativeRepository.findOne({
        where: { result_id: resultId, initiative_id: row?.id, is_active: true },
      });
      if (!link) {
        this.logger.error(
          `[saveInvestmentPrograms] No active initiative link for result ${resultId} / initiative ${row?.id}; row skipped`,
        );
        continue;
      }

      const budget = await this._resultInitiativesBudgetRepository.findOne({
        where: { result_initiative_id: link.id, is_active: true },
      });
      const kind_cash = this.amountToSave(row);
      const is_determined = row.is_determined ?? null;

      if (budget) {
        budget.kind_cash = kind_cash;
        budget.is_determined = is_determined;
        budget.last_updated_by = userId;
        await this._resultInitiativesBudgetRepository.save(budget);
        continue;
      }
      if (this.isEmptyRow(row, kind_cash)) continue;

      await this._resultInitiativesBudgetRepository.save(
        this._resultInitiativesBudgetRepository.create({
          result_initiative_id: link.id,
          kind_cash,
          is_determined,
          is_active: true,
          created_by: userId,
          last_updated_by: userId,
        }),
      );
    }
  }

  /**
   * Upserts one budget row per incoming project row, ALWAYS keyed by `result_project_id`, pinning
   * `non_pooled_projetct_id` to null so the row can never be read back as a legacy pooled-funding
   * one. A `non_pooled_projetct_budget_id` sent by the client is honoured only when it really
   * belongs to that link.
   */
  async saveInvestmentBilateral(
    resultId: number,
    userId: number,
    rows?: InvestmentRowDto[],
  ): Promise<void> {
    if (!Array.isArray(rows) || !rows.length) return;

    for (const row of rows) {
      const projectId = row?.project_id ?? row?.id;
      if (projectId === null || projectId === undefined) {
        this.logger.error(
          `[saveInvestmentBilateral] Row without project_id/id for result ${resultId}; row skipped`,
        );
        continue;
      }

      const link = await this._resultByProjectRepository.findOne({
        where: { result_id: resultId, project_id: projectId, is_active: true },
      });
      if (!link) {
        this.logger.error(
          `[saveInvestmentBilateral] No active project link for result ${resultId} / project ${projectId}; row skipped`,
        );
        continue;
      }

      let budget = null;
      if (row.non_pooled_projetct_budget_id) {
        budget = await this._resultBilateralBudgetRepository.findOne({
          where: {
            non_pooled_projetct_budget_id: Number(
              row.non_pooled_projetct_budget_id,
            ),
            result_project_id: link.id,
            is_active: true,
          },
        });
      }
      budget ??= await this._resultBilateralBudgetRepository.findOne({
        where: { result_project_id: link.id, is_active: true },
      });

      const kind_cash = this.amountToSave(row);
      const is_determined = row.is_determined ?? null;

      if (budget) {
        budget.kind_cash = kind_cash;
        budget.is_determined = is_determined;
        budget.non_pooled_projetct_id = null;
        budget.last_updated_by = userId;
        await this._resultBilateralBudgetRepository.save(budget);
        continue;
      }
      if (this.isEmptyRow(row, kind_cash)) continue;

      await this._resultBilateralBudgetRepository.save(
        this._resultBilateralBudgetRepository.create({
          result_project_id: link.id,
          non_pooled_projetct_id: null,
          kind_cash,
          is_determined,
          is_active: true,
          created_by: userId,
          last_updated_by: userId,
        }),
      );
    }
  }

  /**
   * Upserts one budget row per incoming partner row.
   *
   * ⚠️ Unlike the other two, this one stores whatever `kind_cash` arrives even when
   * `is_determined` is true, exactly as `savePartnerInvestment` does in v2. The asymmetry is
   * preserved on purpose so the same table cannot behave differently depending on which form
   * wrote it; the client enforces the exclusion anyway. Fixing it is a separate ticket.
   */
  async saveInvestmentPartners(
    resultId: number,
    userId: number,
    rows?: InvestmentRowDto[],
  ): Promise<void> {
    if (!Array.isArray(rows) || !rows.length) return;

    for (const row of rows) {
      const link = await this._resultByIntitutionsRepository.findOne({
        where: {
          result_id: resultId,
          institutions_id: row?.id,
          is_active: true,
        },
      });
      if (!link) {
        this.logger.error(
          `[saveInvestmentPartners] No active institution link for result ${resultId} / institution ${row?.id}; row skipped`,
        );
        continue;
      }

      const budget = await this._resultInstitutionsBudgetRepository.findOne({
        where: { result_institution_id: link.id, is_active: true },
      });
      const kind_cash = this.toNumberOrNull(row.kind_cash);
      const is_determined = row.is_determined ?? null;

      if (budget) {
        budget.kind_cash = kind_cash;
        budget.is_determined = is_determined;
        budget.last_updated_by = userId;
        await this._resultInstitutionsBudgetRepository.save(budget);
        continue;
      }
      if (this.isEmptyRow(row, kind_cash)) continue;

      await this._resultInstitutionsBudgetRepository.save(
        this._resultInstitutionsBudgetRepository.create({
          result_institution_id: link.id,
          kind_cash,
          is_determined,
          is_active: true,
          created_by: userId,
          last_updated_by: userId,
        }),
      );
    }
  }
}
