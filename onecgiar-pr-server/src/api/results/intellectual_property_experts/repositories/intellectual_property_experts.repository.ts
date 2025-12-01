import { Injectable } from '@nestjs/common';
import { IntellectualPropertyExpert } from '../entities/intellectual_property_expert.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class IntellectualPropertyExpertRepository {
  constructor(private dataSource: DataSource) {}

  private repo = this.dataSource.getRepository(IntellectualPropertyExpert);

  async getIpExpertsEmailsByResultId(resultId: number) {
    return this.repo
      .createQueryBuilder('rie')
      .select([
        'rie.email AS email  ',
        'rie.first_name AS first_name',
        'rie.last_name AS last_name',
      ])
      .innerJoin('rie.obj_center', 'cc')
      .innerJoin('cc.result_center_array', 'rc', 'rc.is_active = true')
      .innerJoin(
        'rc.result_object',
        'r',
        'r.is_active = true AND r.id = :resultId',
        { resultId },
      )
      .where('rie.is_active = true')
      .getRawMany();
  }
}
