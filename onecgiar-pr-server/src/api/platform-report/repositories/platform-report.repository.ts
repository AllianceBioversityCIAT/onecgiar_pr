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
