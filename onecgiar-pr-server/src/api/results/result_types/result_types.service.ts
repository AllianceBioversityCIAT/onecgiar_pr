import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultTypeDto } from './dto/create-result_type.dto';
import { UpdateResultTypeDto } from './dto/update-result_type.dto';
import { HandlersError, returnErrorDto } from '../../../shared/handlers/error.utils';
import { ResultTypeRepository } from './resultType.repository';
import { ResultType } from './entities/result_type.entity';
import { retunrFormatResultType } from './dto/return-format-result-type.dto';
import { MessageResponse } from '../../../shared/constants/Responses.constant';

@Injectable()
export class ResultTypesService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultTypeRepository:ResultTypeRepository
  ){}

  create(createResultTypeDto: CreateResultTypeDto) {
    return 'This action adds a new resultType';
  }

  async getAllResultType(): Promise<retunrFormatResultType|returnErrorDto> {
    try {
      const resultType:ResultType[] = await this._resultTypeRepository.getAllResultType();
      return {
        response: resultType,
        message: MessageResponse.OK,
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({error, debug: true});
    }
  }

  async findOneResultType(id: number):Promise<retunrFormatResultType|returnErrorDto> {
    try {
      const resultType:ResultType = await this._resultTypeRepository.findOne({where:{id: id}});
      if(!resultType){
        throw {
          response: {},
          message: 'Result Type not dound',
          status: HttpStatus.NOT_FOUND
        }
      }
      return {
        response: resultType,
        message: MessageResponse.OK,
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({error, debug: true});
    }
  }

  update(id: number, updateResultTypeDto: UpdateResultTypeDto) {
    return `This action updates a #${id} resultType`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultType`;
  }
}
