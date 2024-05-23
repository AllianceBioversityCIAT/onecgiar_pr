import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { EvidenceSharepoint } from '../entities/evidence-sharepoint.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class EvidenceSharepointRepository
  extends BaseRepository<EvidenceSharepoint>
  implements LogicalDelete<EvidenceSharepoint>
{
  createQueries(
    config: ReplicableConfigInterface<EvidenceSharepoint>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
      es.document_id,	
      es.file_name,
      es.folder_path,	
      es.is_public_file,	
      e2.id as evidence_id,	
      es.is_active,	
      now() as created_date,	
      now() as last_updated_date,	
      ${config.user.id} as created_by,	
      ${config.user.id} as last_updated_by
      from evidence_sharepoint es 
      inner join evidence e on e.id = es.evidence_id 
                  and es.is_active > 0
      inner join evidence e2 on e.link = e2.link 
                  and e2.result_id = ${config.new_result_id}
      where e.result_id = ${config.old_result_id} and e.is_active > 0;`,
      insertQuery: `
      insert into evidence_sharepoint (
        document_id,	
        file_name,
        folder_path,	
        is_public_file,	
        evidence_id,	
        is_active,	
        created_date,	
        last_updated_date,	
        created_by,	
        last_updated_by
        )
        select 
        es.document_id,	
        es.file_name,
        es.folder_path,	
        es.is_public_file,	
        e2.id as evidence_id,	
        es.is_active,	
        now() as created_date,	
        now() as last_updated_date,	
        ${config.user.id} as created_by,	
        ${config.user.id} as last_updated_by
        from evidence_sharepoint es 
        inner join evidence e on e.id = es.evidence_id 
                    and es.is_active > 0
        inner join evidence e2 on e.link = e2.link 
                    and e2.result_id = ${config.new_result_id}
        where e.result_id = ${config.old_result_id} and e.is_active > 0;`,
      returnQuery: `
      select 
      es.*
      from evidence_sharepoint es 
      inner join evidence e on e.id = es.evidence_id 
                  and es.is_active > 0
      where e.result_id = ${config.new_result_id}`,
    };
  }
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
  async fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete es from evidence_sharepoint es 
    inner join evidence e on e.id = es.evidence_id
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
