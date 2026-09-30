import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsInvestmentDiscontinuedOption } from './entities/results-investment-discontinued-option.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { selectManager } from '../../../shared/utils/orm.util';

@Injectable()
export class ResultsInvestmentDiscontinuedOptionRepository
  extends Repository<ResultsInvestmentDiscontinuedOption>
  implements LogicalDelete<ResultsInvestmentDiscontinuedOption>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(
      ResultsInvestmentDiscontinuedOption,
      dataSource.createEntityManager(),
    );
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rido from results_investment_discontinued_options rido where rido.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInvestmentDiscontinuedOptionRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(
    resultId: number,
  ): Promise<ResultsInvestmentDiscontinuedOption> {
    const queryData = `update results_investment_discontinued_options rido set rido.is_active = 0 where rido.result_id = ? and rido.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInvestmentDiscontinuedOptionRepository.name,
          debug: true,
        }),
      );
  }

  /**
   * BIL-RAU-T-1 (DD-6): `manager` is optional and trailing. Absent, the SQL and behavior are
   * byte-identical to before — the raw query still runs on `this.dataSource`. Present, the same
   * two statements run on `manager` instead, so the bilateral writer can wrap this call inside
   * its own transaction (§5 of the design).
   *
   * BIL-RAU-T-10 (security): `options` is client-supplied (ids ticked in the UI, reaching this
   * repository with no ValidationPipe in front of it). Every value now travels as a bound `?`
   * placeholder — never interpolated into the SQL text — so a crafted id such as
   * `1) OR (1=1` cannot turn the deactivate statement into a table-wide UPDATE. Behavior is
   * otherwise unchanged: same rows deactivated/activated, same empty-list semantics (a single
   * deactivate-all call, no `in (...)` clause), same manager routing.
   */
  async inactiveData(
    options: number[],
    result_id: number,
    user_id: number,
    manager?: EntityManager,
  ) {
    const placeholders = options.map(() => '?').join(',');
    const changeActive = (
      active: boolean,
    ) => `update results_investment_discontinued_options  
    set is_active = ${active ? `1` : `0`}, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
    where is_active > 0 
    	and result_id = ?
    	${
        options.length
          ? `and investment_discontinued_option_id  ${
              active ? `` : `not`
            } in (${placeholders})`
          : ``
      }`;
    const runner: { query: DataSource['query'] } = manager ?? this.dataSource;
    try {
      await runner.query(changeActive(false), [user_id, result_id, ...options]);
      if (options.length) {
        await runner.query(changeActive(true), [
          user_id,
          result_id,
          ...options,
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInvestmentDiscontinuedOptionRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  /**
   * Manager-aware find/update/save wrappers for the discontinuation helper `BIL-RAU-T-2` will
   * extract from `results.service.ts:832-896`. Absent `manager`, they run on `this` exactly as
   * the inline code does today; present, they run on `manager.getRepository(...)` so the whole
   * discontinuation write can live inside the bilateral writer's transaction (DD-6).
   *
   * 🛑 Deliberately NOT an override of the inherited TypeORM `findOne`/`update`/`save` — those
   * are called directly (without a manager) by several other consumers of this repository
   * (`ipsr.service.ts`, `result-innovation-package.service.ts`, `ipsr_general_information.service.ts`,
   * `innovation-use.service.ts`). Overriding them would change a signature shared by callers that
   * have no transaction to pass.
   */
  async findOneDiscontinuedOption(
    where: FindOptionsWhere<ResultsInvestmentDiscontinuedOption>,
    manager?: EntityManager,
  ): Promise<ResultsInvestmentDiscontinuedOption> {
    const repo = selectManager(
      manager,
      ResultsInvestmentDiscontinuedOption,
      this,
    );
    return repo.findOne({ where });
  }

  async updateDiscontinuedOption(
    id: number,
    patch: Partial<ResultsInvestmentDiscontinuedOption>,
    manager?: EntityManager,
  ) {
    const repo = selectManager(
      manager,
      ResultsInvestmentDiscontinuedOption,
      this,
    );
    return repo.update(id, patch);
  }

  async saveDiscontinuedOption(
    data: Partial<ResultsInvestmentDiscontinuedOption>,
    manager?: EntityManager,
  ) {
    const repo = selectManager(
      manager,
      ResultsInvestmentDiscontinuedOption,
      this,
    );
    return repo.save(data);
  }
}
