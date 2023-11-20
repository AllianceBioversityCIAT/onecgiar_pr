import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PrimaryImpactArea } from './entities/primary-impact-area.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class PrimaryImpactAreaRepository
  extends Repository<PrimaryImpactArea>
  implements LogicalDelete<PrimaryImpactArea>
{
  constructor(private dataSource: DataSource) {
    super(PrimaryImpactArea, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<PrimaryImpactArea> {
    throw new Error('Method not implemented.');
  }
  fisicalDelete(resultId: number): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
