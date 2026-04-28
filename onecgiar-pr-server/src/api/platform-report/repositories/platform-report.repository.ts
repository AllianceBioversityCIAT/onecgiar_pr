import { DataSource, Repository } from 'typeorm';
import { PlatformReport } from '../entities/platform-report.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformReportRepository extends Repository<PlatformReport> {
  constructor(
    private _dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(PlatformReport, _dataSource.createEntityManager());
  }

  /**
   * Calls sp_result_full_metadata_batch: JSON array of
   * { result_code, version_id } + PDF base URL → JSON array of
   * { result_code, version_id, payload } | { result_code, version_id, error }.
   */
  async runFullMetadataBatchProcedure(
    pairsJson: string,
    pdfUrl: string,
  ): Promise<unknown> {
    try {
      await this.query(
        `CALL sp_result_full_metadata_batch(?, ?, @prms_full_meta_batch)`,
        [pairsJson, pdfUrl],
      );
      const rows = (await this.query(
        `SELECT @prms_full_meta_batch AS batch_json`,
      )) as { batch_json?: unknown }[];
      return rows?.[0]?.batch_json ?? null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: PlatformReportRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getDataFromProcedure(procedureName: string, parameters: any[]) {
    /*
        the number of parameters of the function to be called depends on the
        parameters array, and as named queries are not supported (yet) on our
        project, we need to create a positional argument string that accomodates
        the lenght of the parameters array
    */
    const paramString: string = '?'
      .repeat(parameters?.length ?? 0)
      .split('')
      .join(',');

    const query = `select ${procedureName}(${paramString}) as result`;
    try {
      return await this.query(query, parameters);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: PlatformReportRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
