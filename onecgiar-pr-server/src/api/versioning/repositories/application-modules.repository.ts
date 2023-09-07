import { Injectable, Logger } from '@nestjs/common';
import { ApplicationModules } from '../entities/application-modules.entity';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ApplicationModulesRepository extends Repository<ApplicationModules> {
  private readonly _logger: Logger = new Logger(
    ApplicationModulesRepository.name,
  );
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ApplicationModules, dataSource.createEntityManager());
  }
}
