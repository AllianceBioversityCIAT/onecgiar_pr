import { Injectable } from '@nestjs/common';
import { CreateClarisaInnovationReadinessLevelDto } from './dto/create-clarisa-innovation-readiness-level.dto';
import { UpdateClarisaInnovationReadinessLevelDto } from './dto/update-clarisa-innovation-readiness-level.dto';

@Injectable()
export class ClarisaInnovationReadinessLevelsService {
  create(createClarisaInnovationReadinessLevelDto: CreateClarisaInnovationReadinessLevelDto) {
    return 'This action adds a new clarisaInnovationReadinessLevel';
  }

  findAll() {
    return `This action returns all clarisaInnovationReadinessLevels`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInnovationReadinessLevel`;
  }

  update(id: number, updateClarisaInnovationReadinessLevelDto: UpdateClarisaInnovationReadinessLevelDto) {
    return `This action updates a #${id} clarisaInnovationReadinessLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInnovationReadinessLevel`;
  }
}
