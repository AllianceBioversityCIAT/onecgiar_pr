import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultTypeDto } from './dto/create-result_type.dto';
import { UpdateResultTypeDto } from './dto/update-result_type.dto';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { ResultTypeRepository } from './resultType.repository';
import { ResultType } from './entities/result_type.entity';
import { returnFormatResultType } from './dto/return-format-result-type.dto';
import { MessageResponse } from '../../../shared/constants/Responses.constant';

@Injectable()
export class ResultTypesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultTypeRepository: ResultTypeRepository,
  ) {}

  create(createResultTypeDto: CreateResultTypeDto) {
    return createResultTypeDto;
  }

  async getAllResultType(): Promise<
    returnFormatResultType<ResultType[]> | returnErrorDto
  > {
    try {
      const resultType: ResultType[] =
        await this._resultTypeRepository.getAllResultType();
      if (!resultType.length) {
        throw {
          response: {},
          message: `Results Types Not Found `,
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: resultType,
        message: MessageResponse.OK,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findOneResultType(
    id: number,
  ): Promise<returnFormatResultType<ResultType> | returnErrorDto> {
    try {
      if (!id) {
        throw {
          response: {},
          message: 'Invalid Result Type Id',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const resultType: ResultType = await this._resultTypeRepository.findOne({
        where: { id: id },
      });
      if (!resultType) {
        throw {
          response: {},
          message: 'Result Type not found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: resultType,
        message: MessageResponse.OK,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  update(id: number, updateResultTypeDto: UpdateResultTypeDto) {
    return `This action updates a #${id} resultType ${updateResultTypeDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultType`;
  }
}
