import { Injectable } from '@nestjs/common';
import { CreateResultIpEoiOutcomeDto } from './dto/create-result-ip-eoi-outcome.dto';
import { UpdateResultIpEoiOutcomeDto } from './dto/update-result-ip-eoi-outcome.dto';

@Injectable()
export class ResultIpEoiOutcomesService {
  create(createResultIpEoiOutcomeDto: CreateResultIpEoiOutcomeDto) {
    return 'This action adds a new resultIpEoiOutcome';
  }

  findAll() {
    return `This action returns all resultIpEoiOutcomes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultIpEoiOutcome`;
  }

  update(id: number, updateResultIpEoiOutcomeDto: UpdateResultIpEoiOutcomeDto) {
    return `This action updates a #${id} resultIpEoiOutcome`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultIpEoiOutcome`;
  }
}
