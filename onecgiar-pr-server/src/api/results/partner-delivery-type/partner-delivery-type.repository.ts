import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { PartnerDeliveryType } from './entities/partner-delivery-type.entity';

@Injectable()
export class PartnerDeliveryTypeRepository extends Repository<PartnerDeliveryType> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(PartnerDeliveryType, dataSource.createEntityManager());
  }

  
}