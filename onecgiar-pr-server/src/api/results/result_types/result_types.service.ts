import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultTypeDto } from './dto/create-result_type.dto';
import { UpdateResultTypeDto } from './dto/update-result_type.dto';
import { HandlersError, returnErrorDto } from '../../../shared/handlers/error.utils';
import { ResultTypeRepository } from './resultType.repository';
import { ResultType } from './entities/result_type.entity';
import { retunrFormatResultType } from './dto/return-format-result-type.dto';

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
      console.log(resultType)
      return {
        response: resultType,
        message: '',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({error, debug: true});
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} resultType`;
  }

  update(id: number, updateResultTypeDto: UpdateResultTypeDto) {
    return `This action updates a #${id} resultType`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultType`;
  }
}
