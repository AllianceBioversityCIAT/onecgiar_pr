import {
  EntityManager,
  EntityTarget,
  ObjectType,
  QueryRunner,
  Repository,
} from 'typeorm';
import {
  ConfigCustomQueryInterface,
  GetQueryConfigurationsInterface,
  ReplicableConfigInterface,
} from '../globalInterfaces/replicable.interface';
import { ReturnResponseUtil } from '../utils/response.util';
import { HttpStatus } from '@nestjs/common';

export abstract class ReplicableRepository<T>
  extends Repository<T>
  implements GetQueryConfigurationsInterface<T>
{
  constructor(
    target: EntityTarget<T>,
    manager: EntityManager,
    queryRunner?: QueryRunner,
  ) {
    super(target, manager, queryRunner);
  }

  abstract createQueries(
    config: ReplicableConfigInterface<T>,
  ): ConfigCustomQueryInterface;

  async replicate(
    manager: EntityManager,
    config: ReplicableConfigInterface<T>,
  ): Promise<T | T[]> {
    const configQuery = this.createQueries(config);
    const validQuery = this.validateConfigQuery(configQuery);
    const entityTarget: ObjectType<T> = this.target as ObjectType<T>;
    if (!validQuery)
      throw ReturnResponseUtil.format<T>(
        {
          message: `configQuery is not defined`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          response: null,
        },
        entityTarget,
      );

    let final_data: T[] = null;
    if (config.f?.custonFunction) {
      const response: T[] = await manager
        .getRepository<T>(this.target)
        .query(configQuery.findQuery);
      const response_edit = <T[]>config.f.custonFunction(response);
      final_data = await this.save(response_edit);
    } else {
      await manager
        .getRepository<T>(this.target)
        .query(configQuery.insertQuery);
      final_data = await await manager
        .getRepository<T>(this.target)
        .query(configQuery.returnQuery);
    }

    config.f?.completeFunction?.({ ...final_data });
    return final_data;
  }

  private validateConfigQuery(config: ConfigCustomQueryInterface): boolean {
    for (let key in config) {
      if (!config[key]?.length) {
        return false;
      }
    }
    return true;
  }
}
