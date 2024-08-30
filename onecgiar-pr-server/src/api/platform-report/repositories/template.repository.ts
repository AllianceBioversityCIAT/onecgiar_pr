import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Template } from '../entities/template.entity';

@Injectable()
export class TemplateRepository extends Repository<Template> {
  constructor(
    private _dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(Template, _dataSource.createEntityManager());
  }
}
