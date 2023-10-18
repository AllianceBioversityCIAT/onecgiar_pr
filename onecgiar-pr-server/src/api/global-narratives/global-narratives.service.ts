import { Injectable, HttpStatus } from '@nestjs/common';
import {
  ReturnResponse,
  ReturnResponseDto,
} from '../../shared/handlers/error.utils';

@Injectable()
export class GlobalNarrativesService {
  constructor(private readonly _returnResponse: ReturnResponse) {}

  //TODO find out if this implementation is correct/makes sense
  async findOne(id: number): Promise<ReturnResponseDto<string>> {
    try {
      return this._returnResponse.format({
        response: 'Example',
        statusCode: HttpStatus.ACCEPTED,
        message: 'nice',
      });
    } catch (error) {
      return this._returnResponse.format(error);
    }
  }
}
