/**
 * One row of any of the three "Investment (USD)" tables (P2-3390).
 *
 * `id` is always the CLARISA id of the entity the row belongs to — initiative, project or
 * institution — never a PRMS join-table PK. That is the same convention the v2 innovation-use
 * payload uses and what `app-estimates-cgiar` round-trips, so one flat contract serves the read
 * and the write.
 */
export class InvestmentRowDto {
  /** CLARISA id of the initiative / project / institution the amount belongs to. */
  public id: number;
  /** Bilateral rows may name the project here instead of in `id`; both are accepted. */
  public project_id?: number;
  /** PK of an existing bilateral budget row, when the client already knows it. */
  public non_pooled_projetct_budget_id?: number;
  /** Amount in USD. Null while unanswered, and forced to null when `is_determined` is true. */
  public kind_cash?: number | string | null;
  /** "This is yet to be determined" — mutually exclusive with `kind_cash`. */
  public is_determined?: boolean | null;
  /** Read-only labels the table renders; ignored on write. */
  public official_code?: string | null;
  public name?: string | null;
}
