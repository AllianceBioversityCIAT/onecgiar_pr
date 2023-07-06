import { Injectable } from '@nestjs/common';
import { CreateResultStatusDto } from './dto/create-result-status.dto';
import { UpdateResultStatusDto } from './dto/update-result-status.dto';

@Injectable()
export class ResultStatusService {
  create(createResultStatusDto: CreateResultStatusDto) {
    return 'This action adds a new resultStatus';
  }

  findAll() {
    return `This action returns all resultStatus`;
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
