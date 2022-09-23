import { Injectable } from '@nestjs/common';
import { CreateEvidenceTypeDto } from './dto/create-evidence_type.dto';
import { UpdateEvidenceTypeDto } from './dto/update-evidence_type.dto';

@Injectable()
export class EvidenceTypesService {
  create(createEvidenceTypeDto: CreateEvidenceTypeDto) {
    return 'This action adds a new evidenceType';
  }

  findAll() {
    return `This action returns all evidenceTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} evidenceType`;
  }

  update(id: number, updateEvidenceTypeDto: UpdateEvidenceTypeDto) {
    return `This action updates a #${id} evidenceType`;
  }

  remove(id: number) {
    return `This action removes a #${id} evidenceType`;
  }
}
