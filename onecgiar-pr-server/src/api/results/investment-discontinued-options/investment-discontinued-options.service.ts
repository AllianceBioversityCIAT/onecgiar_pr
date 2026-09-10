import { Injectable, HttpStatus } from '@nestjs/common';
import { ReturnResponse } from '../../../shared/handlers/error.utils';
import { InvestmentDiscontinuedOptionRepository } from './investment-discontinued-options.repository';
import { EnvironmentExtractor } from '../../../shared/utils/environment-extractor';
import { InvestmentDiscontinuedOption } from './entities/investment-discontinued-option.entity';

@Injectable()
export class InvestmentDiscontinuedOptionsService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _investmentDiscontinuedOptionRepository: InvestmentDiscontinuedOptionRepository,
  ) {}

  /**
   * The discontinuation reasons for a result type, for ONE phase generation.
   *
   * P2-3292 Step 2 — the catalogue has no phase column of its own beyond
   * `phase_year_from`, which marks the phase a reason was introduced for. Rows
   * that predate the axis carry `NULL` (the base generation). Serving the union of
   * every generation would put thirteen reasons in one checklist, so exactly one
   * generation is served: the newest whose `phase_year_from` is at or below
   * `phaseYear`.
   *
   * `phaseYear` omitted (or unparseable) means the base generation — byte-for-byte
   * the answer this endpoint gave before the axis existed, which is what keeps
   * every caller that does not know about phases working unchanged.
   */
  async findAll(resultTypeId: number, phaseYear?: number) {
    try {
      const rows = await this._investmentDiscontinuedOptionRepository.find({
        where: {
          result_type_id: resultTypeId == 2 ? 7 : resultTypeId,
          is_active: true,
        },
        order: { order: 'ASC' },
      });

      const res = this.selectGeneration(rows, phaseYear);

      return this._returnResponse.format({
        message: 'InvestmentDiscontinuedOptions found',
        response: res,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  /**
   * Keeps only the generation in force for `phaseYear`: the greatest
   * `phase_year_from` that is at or below it, or the `NULL` rows when there is none.
   */
  private selectGeneration(
    rows: InvestmentDiscontinuedOption[],
    phaseYear?: number,
  ): InvestmentDiscontinuedOption[] {
    const year = Number(phaseYear);
    const generationOf = (row: InvestmentDiscontinuedOption) =>
      row.phase_year_from == null ? null : Number(row.phase_year_from);

    const inForce = Number.isFinite(year)
      ? rows
          .map(generationOf)
          .filter((g): g is number => g != null && g <= year)
          .reduce<number | null>(
            (max, g) => (max == null || g > max ? g : max),
            null,
          )
      : null;

    return rows.filter((row) => generationOf(row) === inForce);
  }
}
