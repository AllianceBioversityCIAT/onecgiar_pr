import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TocLevel } from './entities/toc-level.entity';
import {
  formatUnknownError,
  throwServiceError,
} from '../../shared/utils/service-error.util';

@Injectable()
export class TocLevelRepository extends Repository<TocLevel> {
  constructor(private readonly dataSource: DataSource) {
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
      throwServiceError(
        `[${TocLevelRepository.name}] => deleteAllData error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllTocLevel() {
    const queryData = `
    SELECT  
      tl.toc_level_id,
      tl.name,
      tl.description 
      FROM toc_level tl;
    `;
    try {
      const tocResult: TocLevel[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throwServiceError(
        `[${TocLevelRepository.name}] => getAllTocResults error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTocLevelByResult() {
    const queryData = `
    SELECT  
      tl.toc_level_id,
      tl.name,
      tl.description 
    FROM toc_level tl;
    `;
    try {
      const tocResult: TocLevel[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throwServiceError(
        `[${TocLevelRepository.name}] => getAllTocResults error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
