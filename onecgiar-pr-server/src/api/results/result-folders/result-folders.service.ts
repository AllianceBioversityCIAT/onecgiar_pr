import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultFolderDto } from './dto/create-result-folder.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultFolderRepository } from './repositories/result-folder-type.repository copy';
import { ResultFolderTypeRepository } from './repositories/result-folder-type.repository';
import { ReturnResponse } from '../../../shared/handlers/error.utils';
import { ResultFolder } from './entities/result-folder.entity';
import { CreateResultFolderTypeDto } from './dto/create-result-folder-type.dto';
import { ResultFolderType } from './entities/result-folder-type.entity';
import { ResultFolderTypeData } from '../../../shared/constants/result-folder-type.enum';
import { ActiveElementData } from '../../../shared/constants/active-element.enum';
import { EnvironmentExtractor } from '../../../shared/utils/environment-extractor';

@Injectable()
export class ResultFoldersService {
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _resultFolderRepository: ResultFolderRepository,
    private readonly _resultFolderTypeRepository: ResultFolderTypeRepository,
  ) {}

  async createResultFolder(
    user: TokenDto,
    createResultFolderDto: CreateResultFolderDto,
  ) {
    try {
      const responseData: ResultFolder =
        await this._resultFolderRepository.save({
          created_by: user.id,
          ...createResultFolderDto,
        });

      return this._returnResponse.format({
        message: 'Result folder created successfully',
        response: responseData,
        statusCode: HttpStatus.CREATED,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async createResultFolderType(
    user: TokenDto,
    createResultFolderTypeDto: CreateResultFolderTypeDto,
  ) {
    try {
      const responseData: ResultFolderType =
        await this._resultFolderTypeRepository.save({
          created_by: user.id,
          ...createResultFolderTypeDto,
        });
      return this._returnResponse.format({
        message: 'Result folder type created successfully',
        response: responseData,
        statusCode: HttpStatus.CREATED,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async findResultFolders(
    type: string,
    status: string,
    id: number,
    phase: number,
  ) {
    try {
      const where: any = {};

      if (id) {
        where.result_folders_id = id;
      }

      if (phase) {
        where.phase_id = phase;
      }

      const objStatus = ActiveElementData.getFromName(status);
      if (objStatus) {
        where.is_active = objStatus.value;
      }

      const objFolderType = ResultFolderTypeData.getFromName(type);
      if (objFolderType) {
        where.folder_type_id = objFolderType.value;
      }

      const responseData: ResultFolder[] =
        await this._resultFolderRepository.find({ where: where });

      return this._returnResponse.format({
        message: 'Result folders retrieved successfully',
        response: responseData,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async findResultFoldersType(status: string, id: number) {
    try {
      const where: any = {};

      if (id) {
        where.result_folders_type_id = id;
      }

      const objStatus = ActiveElementData.getFromName(status);
      if (objStatus) {
        where.is_active = objStatus.value;
      }

      const responseData: ResultFolderType[] =
        await this._resultFolderTypeRepository.find({ where: where });

      return this._returnResponse.format({
        message: 'Result folders retrieved successfully',
        response: responseData,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }
}
