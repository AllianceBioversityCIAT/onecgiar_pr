import { Injectable } from '@nestjs/common';
import { CreateResultsByEvidenceDto } from './dto/create-results_by_evidence.dto';
import { UpdateResultsByEvidenceDto } from './dto/update-results_by_evidence.dto';

@Injectable()
export class ResultsByEvidencesService {
  create(createResultsByEvidenceDto: CreateResultsByEvidenceDto) {
    return 'This action adds a new resultsByEvidence';
  }

  findAll() {
    return `This action returns all resultsByEvidences`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsByEvidence`;
  }

  update(id: number, updateResultsByEvidenceDto: UpdateResultsByEvidenceDto) {
    return `This action updates a #${id} resultsByEvidence`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByEvidence`;
  }
}
