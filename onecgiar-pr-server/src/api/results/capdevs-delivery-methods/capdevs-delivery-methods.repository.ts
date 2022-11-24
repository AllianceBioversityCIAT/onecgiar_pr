import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CapdevsDeliveryMethod } from './entities/capdevs-delivery-method.entity';

@Injectable()
export class CapdevsDeliveryMethodRepository extends Repository<CapdevsDeliveryMethod> {
  constructor(private dataSource: DataSource) {
    super(CapdevsDeliveryMethod, dataSource.createEntityManager());
  }
}
