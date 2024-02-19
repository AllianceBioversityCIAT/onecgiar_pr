import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BiSubpages } from '../entities/bi-subpages.entity';
import { GetBiSubpagesDto } from '../dto/get-bi-subpages.dto';

@Injectable()
export class BiSubpagesRepository extends Repository<BiSubpages> {
  constructor(private dataSource: DataSource) {
    super(BiSubpages, dataSource.createEntityManager());
  }

  async getReportSubPage(getBiSubpagesDto: GetBiSubpagesDto) {
    try {
      if (!getBiSubpagesDto.report_name || !getBiSubpagesDto.subpage_id)
        return 'A parameter is missing to make the query.';

      const biSubpage = await this.query(
        `select section_name from bi_subpages bs WHERE bs.report_name = ? and bs.section_number = ?`,
        [getBiSubpagesDto.report_name, getBiSubpagesDto.subpage_id],
      );

      const { section_name } = biSubpage.shift() ?? {};

      return section_name || 'Record not found';
    } catch (error) {
      console.error(error);
      return error.message;
    }
  }
}
