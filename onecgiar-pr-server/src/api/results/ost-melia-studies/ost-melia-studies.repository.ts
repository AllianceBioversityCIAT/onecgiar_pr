import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MeliaStudyDto } from './dto/melia-study.dto';
import { env } from 'process';
import { MeliaStudyTocDto } from './dto/melia-study-toc.dto';

@Injectable()
export class OstMeliaStudiesRepository {
  constructor(private dataSource: DataSource) {}

  async getMeliaStudiesFromResultId(
    initiativeId: number,
  ): Promise<MeliaStudyDto[]> {
    const query = `
    SELECT
        i.id as initiative_id,
        msa.id as melia_id ,
        concat('(', msa.anticipated_year_completion, ') - ' , msa.result_title) as melia_study_title
    FROM
        ${env.DB_OST}.melia_studies_activities msa
    LEFT JOIN ${env.DB_OST}.initiatives_by_stages ibs on
        ibs.id = msa.initvStgId
    LEFT JOIN ${env.DB_OST}.initiatives i on
        i.id = ibs.initiativeId
    LEFT JOIN prdb.results_by_inititiative rbi on i.id = rbi.inititiative_id 
    WHERE
        msa.active > 0
        and rbi.result_id = ?
        `;
    try {
      const studies: MeliaStudyDto[] = await this.dataSource.query(query, [
        initiativeId,
      ]);
      return studies;
    } catch (error) {
      throw new InternalServerErrorException(
        `[${OstMeliaStudiesRepository.name}] => getMeliaStudiesFromInitiativeId error: ${error}`,
      );
    }
  }

  async getMeliaStudiesByOfficialCode(
    programId: string,
  ): Promise<MeliaStudyTocDto[]> {
    const query = `
      SELECT DISTINCT
        trm.melia_id,
        trm.title,
        tr.official_code
      FROM
        ${env.DB_TOC}.toc_results tr
        INNER JOIN ${env.DB_TOC}.toc_results_melias trm ON trm.toc_result_id = tr.id
      WHERE
        tr.is_active = 1
        AND tr.official_code = ?
    `;
    try {
      const rows: MeliaStudyTocDto[] = await this.dataSource.query(query, [
        programId,
      ]);
      return rows;
    } catch (error) {
      throw new InternalServerErrorException(
        `[${OstMeliaStudiesRepository.name}] => getMeliaStudiesByOfficialCode error: ${error}`,
      );
    }
  }
}
