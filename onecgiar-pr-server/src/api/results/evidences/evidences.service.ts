import { Injectable } from '@nestjs/common';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { EvidencesRepository } from './evidences.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class EvidencesService {
  constructor(
    private readonly _evidencesRepository: EvidencesRepository,
    private readonly _handlersError: HandlersError
  ){}
  create(createEvidenceDto: CreateEvidenceDto) {
    try {
      
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
    return createEvidenceDto;
  }

  findAll() {
    return `This action returns all evidences`;
  }

  findOne(id: number) {
    return `This action returns a #${id} evidence`;
  }

  update(id: number, updateEvidenceDto: UpdateEvidenceDto) {
    return `This action updates a #${id} evidence ${updateEvidenceDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} evidence`;
  }
}
