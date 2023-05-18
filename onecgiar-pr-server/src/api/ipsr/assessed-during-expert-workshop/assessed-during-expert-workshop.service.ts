import { Injectable } from '@nestjs/common';
import { CreateAssessedDuringExpertWorkshopDto } from './dto/create-assessed-during-expert-workshop.dto';
import { UpdateAssessedDuringExpertWorkshopDto } from './dto/update-assessed-during-expert-workshop.dto';

@Injectable()
export class AssessedDuringExpertWorkshopService {
  create(createAssessedDuringExpertWorkshopDto: CreateAssessedDuringExpertWorkshopDto) {
    return 'This action adds a new assessedDuringExpertWorkshop';
  }

  findAll() {
    return `This action returns all assessedDuringExpertWorkshop`;
  }

  findOne(id: number) {
    return `This action returns a #${id} assessedDuringExpertWorkshop`;
  }

  update(id: number, updateAssessedDuringExpertWorkshopDto: UpdateAssessedDuringExpertWorkshopDto) {
    return `This action updates a #${id} assessedDuringExpertWorkshop`;
  }

  remove(id: number) {
    return `This action removes a #${id} assessedDuringExpertWorkshop`;
  }
}
