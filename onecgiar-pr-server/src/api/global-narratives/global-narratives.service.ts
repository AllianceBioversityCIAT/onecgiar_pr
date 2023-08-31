import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateGlobalNarrativeDto } from './dto/create-global-narrative.dto';
import { UpdateGlobalNarrativeDto } from './dto/update-global-narrative.dto';
import {
  ReturnResponse,
  ReturnResponseDto,
} from '../../shared/handlers/error.utils';

@Injectable()
export class GlobalNarrativesService {
  constructor(private readonly _returnResponse: ReturnResponse) {}
  create(createGlobalNarrativeDto: CreateGlobalNarrativeDto) {
    return 'This action adds a new globalNarrative';
  }

  findAll() {
    return `This action returns all globalNarratives`;
  }

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

  update(id: number, updateGlobalNarrativeDto: UpdateGlobalNarrativeDto) {
    return `This action updates a #${id} globalNarrative`;
  }

  remove(id: number) {
    return `This action removes a #${id} globalNarrative`;
  }
}
