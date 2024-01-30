import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WorldRegionTree } from '../../shared/entities/tree/world-region-tree';
import { HandlersError } from '../../shared/handlers/error.utils';
import { RegionDistanceDto } from './dto/region-distance.dto';
import { ClarisaRegion } from './entities/clarisa-region.entity';

@Injectable()
export class ClarisaRegionsRepository extends Repository<ClarisaRegion> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ClarisaRegion, dataSource.createEntityManager());
  }

  private _worldTree: WorldRegionTree;

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_regions;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaRegionsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async loadWorldTree() {
    if (this._worldTree) {
      return this._worldTree;
    }

    const root = new ClarisaRegion();
    root.um49Code = 1;

    this._worldTree = new WorldRegionTree(root);

    const allRegions = await this.find({
      relations: { parent_region_object: true },
    });

    for (const region of allRegions) {
      const distance = await this.distanceToRoot(region.um49Code);
      region['level'] = distance.distance;
    }

    allRegions
      .sort((a, b) => a['level'] - b['level'])
      .map((r) => {
        if (r.parent_region_object == null) {
          r.parent_region_object = root;
        }

        return r;
      })
      .forEach((r) => this._worldTree.add(r, r.parent_region_object));

    return this._worldTree;
  }

  async distanceToRoot(regionId: number): Promise<RegionDistanceDto> {
    const query = `
    WITH RECURSIVE sub_region(um49Code, name, parent_regions_code, level) AS (
      SELECT um49Code, name, parent_regions_code, 1 FROM clarisa_regions WHERE um49Code= ?
      UNION ALL 
      SELECT cr.um49Code, cr.name, cr.parent_regions_code, level+1
      FROM clarisa_regions cr, sub_region sr
      WHERE cr.um49Code = sr.parent_regions_code  
    ) 
    SELECT um49Code, name, parent_regions_code, (SELECT max(level) FROM sub_region) - level+1 AS distance 
    FROM sub_region
    where um49Code = ?
    ;
    `;

    try {
      const distance: RegionDistanceDto[] = await this.query(query, [
        regionId,
        regionId,
      ]);
      return distance[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ClarisaRegionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  public getWorldTree() {
    return this._worldTree;
  }

  async getAllRegions() {
    const queryData = `
    select 
   	cr.um49Code as id,
   	cr.name,
   	cr.parent_regions_code 
   	from clarisa_regions cr;
    `;
    try {
      const regions = await this.query(queryData);
      return regions;
    } catch (error) {
      throw {
        message: `[${ClarisaRegionsRepository.name}] => getAllRegions error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllNoParentRegions() {
    const queryData = `
    select 
   	cr.um49Code as id,
   	cr.name,
   	cr.parent_regions_code 
   	from clarisa_regions cr
   	where  cr.parent_regions_code is not null
    order by cr.name asc;
    `;
    try {
      const regions = await this.query(queryData);
      return regions;
    } catch (error) {
      throw {
        message: `[${ClarisaRegionsRepository.name}] => getAllRegions error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
