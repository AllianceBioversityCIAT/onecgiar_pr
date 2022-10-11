import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultLevelDto } from './dto/create-result_level.dto';
import { UpdateResultLevelDto } from './dto/update-result_level.dto';
import { HandlersError, returnErrorDto } from '../../../shared/handlers/error.utils';
import { ResultLevelRepository } from './resultLevel.repository';
import { ResultLevel } from './entities/result_level.entity';
import { retunrFormatResultLevel } from './dto/return-format-result-level.dto';
import { ResultTypesService } from '../result_types/result_types.service';
import { ResultType } from '../result_types/entities/result_type.entity';

@Injectable()
export class ResultLevelsService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultLevelRepository:ResultLevelRepository,
    private readonly _resultTypesService:ResultTypesService
  ){}

  create(createResultLevelDto: CreateResultLevelDto) {
    return 'This action adds a new resultLevel';
  }

  async getResultsLevels(): Promise<retunrFormatResultLevel|returnErrorDto> {
    try {
      const resultLevel:ResultLevel[] = await this._resultLevelRepository.find({order: {id: 'ASC'}});
      const {message, response, status} = await this._resultTypesService.getAllResultType();
      if(status >= 300){
        throw {
          response,
          message,
          status
        }
      }

      const restulType: ResultType[] = <ResultType[]>response;
      console.log(restulType);
      console.log(resultLevel);
      resultLevel.map(rl => {
        rl['result_type'] = restulType.filter(rt => rt.result_level_id === rl.id);
      })


      return {
        response: resultLevel,
        message: '',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({error, debug: true});
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} resultLevel`;
  }

  update(id: number, updateResultLevelDto: UpdateResultLevelDto) {
    return `This action updates a #${id} resultLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultLevel`;
  }
}
