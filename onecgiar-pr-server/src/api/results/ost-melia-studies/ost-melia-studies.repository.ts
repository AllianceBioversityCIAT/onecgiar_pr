import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MeliaStudyDto } from './dto/melia-study.dto';
import { env } from 'process';

@Injectable()
export class OstMeliaStudiesRepository {
  constructor(private dataSource: DataSource) {}

  async getMeliaStudiesFromResultId(
    initiativeId: number,
  ): Promise<MeliaStudyDto[]> {
    const query: string = `
    SELECT
        i.id as initiative_id,
        msa.id as melia_id ,
        concat('(', msa.anticipated_year_completion, ') - ' , msa.result_title) as melia_study_title
    FROM
        submissiontooldb.melia_studies_activities msa
    LEFT JOIN submissiontooldb.initiatives_by_stages ibs on
        ibs.id = msa.initvStgId
    LEFT JOIN submissiontooldb.initiatives i on
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
      throw {
        message: `[${OstMeliaStudiesRepository.name}] => getMeliaStudiesFromInitiativeId error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
