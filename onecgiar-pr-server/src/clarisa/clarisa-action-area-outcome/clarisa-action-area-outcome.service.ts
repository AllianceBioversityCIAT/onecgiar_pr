import { Injectable } from '@nestjs/common';
import { CreateClarisaActionAreaOutcomeDto } from './dto/create-clarisa-action-area-outcome.dto';
import { UpdateClarisaActionAreaOutcomeDto } from './dto/update-clarisa-action-area-outcome.dto';

@Injectable()
export class ClarisaActionAreaOutcomeService {
  create(createClarisaActionAreaOutcomeDto: CreateClarisaActionAreaOutcomeDto) {
    return 'This action adds a new clarisaActionAreaOutcome';
  }

  findAll() {
    return `This action returns all clarisaActionAreaOutcome`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaActionAreaOutcome`;
  }

  update(id: number, updateClarisaActionAreaOutcomeDto: UpdateClarisaActionAreaOutcomeDto) {
    return `This action updates a #${id} clarisaActionAreaOutcome`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaActionAreaOutcome`;
  }
}
