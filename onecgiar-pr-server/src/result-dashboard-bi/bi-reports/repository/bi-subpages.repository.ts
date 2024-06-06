import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BiSubpages } from '../entities/bi-subpages.entity';

@Injectable()
export class BiSubpagesRepository extends Repository<BiSubpages> {
  constructor(private dataSource: DataSource) {
    super(BiSubpages, dataSource.createEntityManager());
  }

  async getSubPageByReportId(report_id: number, subpage_id: string | number) {
    try {
      if (!report_id || !subpage_id)
        return 'A parameter is missing to make the query.';

      const biSubpage = await this.query(
        `select page_name from bi_subpages bs WHERE bs.report_id = ? and bs.section_number = ?`,
        [report_id, subpage_id],
      );

      const { page_name } = biSubpage.shift() ?? {};

      return page_name || 'Record not found';
    } catch (error) {
      console.error(error);
      return error.message;
    }
  }
}
