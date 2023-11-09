import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { EvidenceSharepoint } from '../entities/evidence-sharepoint.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { env } from 'process';

@Injectable()
export class EvidenceSharepointRepository
  extends Repository<EvidenceSharepoint>
  implements LogicalDelete<EvidenceSharepoint>
{
  private readonly _logger: Logger = new Logger(
    EvidenceSharepointRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(EvidenceSharepoint, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<EvidenceSharepoint> {
    const dataQuery = `update evidence_sharepoint es 
    inner join evidence e on e.id = es.evidence_id 
    set es.is_active = 0
  where e.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: EvidenceSharepointRepository.name,
          error: err,
          debug: true,
        }),
      );
  }
}
