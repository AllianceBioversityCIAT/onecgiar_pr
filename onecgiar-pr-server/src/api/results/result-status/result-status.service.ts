import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultStatusDto } from './dto/create-result-status.dto';
import { UpdateResultStatusDto } from './dto/update-result-status.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultStatusRepository } from './result-status.repository';

@Injectable()
export class ResultStatusService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultStatusRepository: ResultStatusRepository,
  ) {}
  create(createResultStatusDto: CreateResultStatusDto) {
    return 'This action adds a new resultStatus';
  }

  async findAll() {
    try {
      const statusList = await this._resultStatusRepository.getAllStatuses();

      return {
        response: statusList,
        message: 'All result status',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} resultStatus`;
  }

  update(id: number, updateResultStatusDto: UpdateResultStatusDto) {
    return `This action updates a #${id} resultStatus`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultStatus`;
  }
}
