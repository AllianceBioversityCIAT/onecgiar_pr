import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultsCenterDto } from './dto/create-results-center.dto';
import { UpdateResultsCenterDto } from './dto/update-results-center.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsCenterRepository } from './results-centers.repository';

@Injectable()
export class ResultsCentersService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultsCenterRepository: ResultsCenterRepository
  ){}

  create(createResultsCenterDto: CreateResultsCenterDto) {
    return 'This action adds a new resultsCenter';
  }

  async findREsultCenterByResultId(resultId: number) {
    try {
      const centers = await this._resultsCenterRepository.getAllResultsCenterByResultId(resultId);
      if(!centers.length){
        throw {
          response: {},
          message: 'Result Centers Not Found',
          status: HttpStatus.NOT_FOUND,
        };
        
      }
      return {
        response: centers,
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsCenter`;
  }

  update(id: number, updateResultsCenterDto: UpdateResultsCenterDto) {
    return `This action updates a #${id} resultsCenter`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsCenter`;
  }
}
