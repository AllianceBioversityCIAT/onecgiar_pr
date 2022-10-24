import { Injectable } from '@nestjs/common';
import { CreateClarisaPolicyStageDto } from './dto/create-clarisa-policy-stage.dto';
import { UpdateClarisaPolicyStageDto } from './dto/update-clarisa-policy-stage.dto';

@Injectable()
export class ClarisaPolicyStagesService {
  create(createClarisaPolicyStageDto: CreateClarisaPolicyStageDto) {
    return 'This action adds a new clarisaPolicyStage';
  }

  findAll() {
    return `This action returns all clarisaPolicyStages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaPolicyStage`;
  }

  update(id: number, updateClarisaPolicyStageDto: UpdateClarisaPolicyStageDto) {
    return `This action updates a #${id} clarisaPolicyStage`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaPolicyStage`;
  }
}
