import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpAAOutcome } from '../entities/result-ip-action-area-outcome.entity';
import { env } from 'process';
import { ResultIpExpertWorkshopOrganized } from '../entities/result-ip-expert-workshop-organized.entity';

@Injectable()
export class ResultIpExpertWorkshopOrganizedRepostory extends Repository<ResultIpExpertWorkshopOrganized> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIpExpertWorkshopOrganized, dataSource.createEntityManager());
  }
}
