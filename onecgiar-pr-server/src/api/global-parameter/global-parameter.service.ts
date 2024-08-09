import { HttpStatus, Injectable } from '@nestjs/common';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import { FindOptionsSelect } from 'typeorm';
import { GlobalParameter } from './entities/global-parameter.entity';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { UpdateGlobalParameterDto } from './dto/update-global-parameter.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

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
    private readonly _roleByUseRepository: RoleByUserRepository,
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
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
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
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async getPlatformGlobalVariables() {
    try {
      const globalVariableList =
        await this._globalParameterRepository.getPlatformGlobalVariables();
      const response = globalVariableList.reduce((obj, item) => {
        if (item.value === '1' || item.value === '0') {
          obj[item.name] = item.value === '1';
        } else {
          obj[item.name] = item.value;
        }
        return obj;
      }, {});
      return this._returnResponse.format({
        message: 'Global parameters found',
        response,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
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
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async updateGlobalParameter(
    updateGlobalParameterDto: UpdateGlobalParameterDto,
    user: TokenDto,
  ) {
    const isAdmin = await this._roleByUseRepository.isUserAdmin(user.id);
    if (isAdmin?.is_admin == false) {
      return this._returnResponse.format({
        message: 'You do not have permission to perform this action',
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    if (!updateGlobalParameterDto || !updateGlobalParameterDto.name) {
      return this._returnResponse.format({
        message: 'Invalid data',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const parameterToUpdate = await this._globalParameterRepository.findOne({
      where: { name: updateGlobalParameterDto.name },
    });
    if (!parameterToUpdate) {
      return this._returnResponse.format({
        message: 'Global parameter not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    parameterToUpdate.value = updateGlobalParameterDto.value;

    return this._globalParameterRepository
      .save(parameterToUpdate)
      .then((response) => {
        return this._returnResponse.format({
          message: 'Global parameter updated',
          response,
          statusCode: HttpStatus.OK,
        });
      })
      .catch((error) => {
        return this._returnResponse.format(
          error,
          !EnvironmentExtractor.isProduction(),
        );
      });
  }
}
