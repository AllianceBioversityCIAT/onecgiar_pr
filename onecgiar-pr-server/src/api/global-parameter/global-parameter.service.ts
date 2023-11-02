import { Injectable } from '@nestjs/common';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';

@Injectable()
export class GlobalParameterService {
  constructor(
    private readonly _globalParameterRepository: GlobalParameterRepository,
  ) {}
  async findAll() {
    const data = await this._globalParameterRepository.find();
    console.log('Get data');
    console.log(data);
    return { result: 'Wroks', data };
  }

  async findByCategoryId(global_parameter_category_id: number) {
    const data = await this._globalParameterRepository.find({
      where: { global_parameter_category_id },
    });
    console.log('Get data');
    console.log(data);
    return { result: 'Wroks', data };
  }
}
