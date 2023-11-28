import { DataSource, Repository } from 'typeorm';
import { ClarisaSubnationalScope } from './entities/clarisa-subnational-scope.entity';
import { HandlersError } from '../../shared/handlers/error.utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClarisaSubnationalScopeRepository extends Repository<ClarisaSubnationalScope> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ClarisaSubnationalScope, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = 'DELETE FROM clarisa_subnational_scopes';

    return this.query(queryData)
      .then((result) => result)
      .catch((error) =>
        this._handlersError.returnErrorRepository({
          className: ClarisaSubnationalScopeRepository.name,
          error,
          debug: true,
        }),
      );
  }
}
