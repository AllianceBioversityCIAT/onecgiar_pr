import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { ClarisaGlobalUnit } from './entities/clarisa-global-unit.entity';

@Injectable()
export class ClarisaGlobalUnitRepository extends Repository<ClarisaGlobalUnit> {
  constructor(private readonly dataSource: DataSource) {
    super(ClarisaGlobalUnit, dataSource.createEntityManager());
  }

  async findByCompositeCode(
    composeCode: string,
    year?: number | null,
  ): Promise<ClarisaGlobalUnit | null> {
    const where: FindOptionsWhere<ClarisaGlobalUnit> = {
      composeCode,
    };
    where.year = year ?? null;

    if (year === null || typeof year === 'undefined') {
      where.year = IsNull();
    }

    return this.findOne({ where });
  }

  async findByCodeAndYear(
    code: string,
    year?: number | null,
  ): Promise<ClarisaGlobalUnit | null> {
    const where: FindOptionsWhere<ClarisaGlobalUnit> = {
      code,
    };

    if (year === null || typeof year === 'undefined') {
      where.year = IsNull();
    } else {
      where.year = year;
    }

    return this.findOne({ where });
  }
}
