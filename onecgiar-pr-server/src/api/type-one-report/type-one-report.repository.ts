import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { env } from 'process';
import { TypeOneReport } from './entities/type-one-report.entity';
import { HandlersError } from 'src/shared/handlers/error.utils';

@Injectable()
export class TypeOneReportRepository {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,

  ) { }

  async getFactSheetByInit(
    initId: number
  ) {
    const initiativeGeneralInformationQuery = `
    SELECT
    ci.official_code,
    ci.name,
    ci.short_name,
    JSON_OBJECT('id',
    gi.action_area_id,
    'name',
    caa.name,
    'description',
    caa.description) as action_area,
    JSON_OBJECT('id',
    u.id,
    'first_name',
    u.first_name,
    'last_name',
    u.last_name) as user_lead,
    JSON_OBJECT('id',
    u2.id,
    'first_name',
    u2.first_name,
    'last_name',
    u2.last_name) as deputy,
    group_concat(DISTINCT cr.name order by cr.name asc SEPARATOR ', ') as regions,
    group_concat(DISTINCT cc.name order by cc.name asc SEPARATOR ', ') as countries,
    CONCAT('[',group_concat( DISTINCT JSON_OBJECT('title', ifnull(rs.result_title, 'null'), 'description', ifnull(rs.result_description, 'null') )),']') as results
  from
    clarisa_initiatives ci
  inner join ${env.DB_OST}.initiatives_by_stages ibs on
    ibs.initiativeId = ci.id
    and ibs.stageId = 4
  inner join ${env.DB_OST}.general_information gi on
    gi.initvStgId = ibs.initiativeId
  inner join ${env.DB_OST}.initiatives_by_users ibu on
    ibu.initiativeId = ci.id
    and ibu.roleId = 2
    and ibu.active > 0
  left join ${env.DB_OST}.users u on
    u.id = ibu.userId
  left join ${env.DB_OST}.initiatives_by_users ibu2 on
    ibu2.initiativeId = ci.id
    and ibu2.roleId = 3
    and ibu2.active > 0
  left join ${env.DB_OST}.users u2 on
    u2.id = ibu2.userId
  left join ${env.DB_OST}.clarisa_action_areas caa on
    caa.id = gi.action_area_id
  left join ${env.DB_OST}.results rs on
    rs.initvStgId = ibs.id
    and rs.active > 0
    and rs.result_type_id = 3
  left join ${env.DB_OST}.regions_by_initiative_by_stage rbibs on
    rbibs.initvStgId = ibs.id
    and rbibs.active > 0
  left join ${env.DB_OST}.clarisa_regions_cgiar cr on
    cr.id = rbibs.region_id
  left join ${env.DB_OST}.countries_by_initiative_by_stage cbibs on
    cbibs.initvStgId = ibs.id
    and cbibs.active > 0
  left join ${env.DB_OST}.clarisa_countries cc on
    cc.code = cbibs.country_id
  WHERE 
    ci.id = ?
  GROUP BY
    ci.official_code,
    ci.name,
    ci.short_name,
    gi.action_area_id,
    caa.name,
    caa.description,
    u.id,
    u.first_name,
    u.last_name,
    u2.id,
    u2.first_name,
    u2.last_name;
    `,
    maxlen = `set SESSION group_concat_max_len = 100000;`;
    try {
      const completeUser2: any[] = await this.dataSource.query(maxlen,);
      console.log(completeUser2);
      const completeUser: any[] = await this.dataSource.query(queryData, [initId]);
      return completeUser[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: TypeOneReportRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}
