import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CGSpaceCountryMappings } from '../entities/cgspace-country-mappings.entity';

@Injectable()
export class CGSpaceCountryMappingsRepository extends Repository<CGSpaceCountryMappings> {
  constructor(private dataSource: DataSource) {
    super(CGSpaceCountryMappings, dataSource.createEntityManager());
  }
}
