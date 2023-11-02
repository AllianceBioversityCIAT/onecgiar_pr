import { Injectable } from '@nestjs/common';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import { FindOptionsSelect, FindOptionsSelectByString } from 'typeorm';
import { GlobalParameter } from './entities/global-parameter.entity';
import { ObjectFlattener } from '../../shared/utils/object-flattener';

@Injectable()
export class GlobalParameterService {
  baseColumnNames: FindOptionsSelect<GlobalParameter> = [
    'name',
    'value',
    'description',
  ] as FindOptionsSelect<GlobalParameter>;
  constructor(
    private readonly _globalParameterRepository: GlobalParameterRepository,
  ) {}
  async findAll() {
    const globalParametersList = await this._globalParameterRepository.find({
      select: this.baseColumnNames,
    });
    return globalParametersList;
  }

  async findByCategoryId(global_parameter_category_id: number) {
    const globalParametersList = await this._globalParameterRepository.find({
      select: this.baseColumnNames,
      where: { global_parameter_category_id },
    });
    return globalParametersList;
  }

  async findOneByName(name: string) {
    const [globalParameter] =
      await this._globalParameterRepository.findOneByName(name);

    return globalParameter;
  }

  // async findByCategoryForfindOneByName
}
