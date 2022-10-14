import { Injectable } from '@nestjs/common';
import { CreateResultByLevelDto } from './dto/create-result-by-level.dto';
import { UpdateResultByLevelDto } from './dto/update-result-by-level.dto';
import { ResultByLevelRepository } from './result-by-level.repository';
import { ResultLevelRepository } from '../result_levels/resultLevel.repository';

@Injectable()
export class ResultByLevelService {
  
  constructor(
    private readonly _resultByLevelRepository: ResultByLevelRepository,
    private readonly _resultLevelRepository: ResultLevelRepository
  ){}

  create(createResultByLevelDto: CreateResultByLevelDto) {
    return 'This action adds a new resultByLevel';
  }

  async findAll() {
    //this._resultByLevelRepository.
    const resultLevel = await this._resultLevelRepository.find();
    return `This action returns all resultByLevel`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultByLevel`;
  }

  update(id: number, updateResultByLevelDto: UpdateResultByLevelDto) {
    return `This action updates a #${id} resultByLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultByLevel`;
  }
}
