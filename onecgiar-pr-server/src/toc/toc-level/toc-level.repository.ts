import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TocLevel } from './entities/toc-level.entity';

@Injectable()
export class TocLevelRepository extends Repository<TocLevel> {
  constructor(private dataSource: DataSource) {
    super(TocLevel, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM toc_level;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${TocLevelRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllTocLevel() {
    const queryData = `
    SELECT  
      tl.toc_level_id,
      tl.name,
      tl.description 
      from toc_level tl;
    `;
    try {
      const tocResult:TocLevel[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocLevelRepository.name}] => getAllTocResults error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

