import { HttpStatus, Injectable } from '@nestjs/common';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import { FindOptionsSelect } from 'typeorm';
import { GlobalParameter } from './entities/global-parameter.entity';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { env } from 'process';

@Injectable()
export class GlobalParameterService {
  baseColumnNames: FindOptionsSelect<GlobalParameter> = [
    'name',
    'value',
    'description',
  ] as FindOptionsSelect<GlobalParameter>;
  constructor(
    private readonly _globalParameterRepository: GlobalParameterRepository,
    private readonly _returnResponse: ReturnResponse,
  ) {}

  async findAll() {
    try {
      const response = await this._globalParameterRepository.find({
        select: this.baseColumnNames,
      });
      return this._returnResponse.format({
        message: 'Global parameters found',
        response,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  async findByCategoryId(global_parameter_category_id: number) {
    try {
      const response = await this._globalParameterRepository.find({
        select: this.baseColumnNames,
        where: { global_parameter_category_id },
      });
      return this._returnResponse.format({
        message: 'Global parameters found',
        response,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  async getPlatformGlobalVariables() {
    try {
      const globalVariableList =
        await this._globalParameterRepository.getPlatformGlobalVariables();
      const response = globalVariableList.reduce((obj, item) => {
        obj[item.name] = item.value === '1';
        return obj;
      }, {});
      return this._returnResponse.format({
        message: 'Global parameters found',
        response,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  async findOneByName(name: string) {
    try {
      const [globalParameter] =
        await this._globalParameterRepository.findOneByName(name);
      return this._returnResponse.format({
        message: 'Global parameters found',
        response: globalParameter,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }
}
