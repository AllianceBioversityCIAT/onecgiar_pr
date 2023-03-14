import { Injectable } from '@nestjs/common';
import { CreateInnovationPackagingExpertDto } from './dto/create-innovation-packaging-expert.dto';
import { UpdateInnovationPackagingExpertDto } from './dto/update-innovation-packaging-expert.dto';

@Injectable()
export class InnovationPackagingExpertsService {
  create(createInnovationPackagingExpertDto: CreateInnovationPackagingExpertDto) {
    return 'This action adds a new innovationPackagingExpert';
  }

  findAll() {
    return `This action returns all innovationPackagingExperts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} innovationPackagingExpert`;
  }

  update(id: number, updateInnovationPackagingExpertDto: UpdateInnovationPackagingExpertDto) {
    return `This action updates a #${id} innovationPackagingExpert`;
  }

  remove(id: number) {
    return `This action removes a #${id} innovationPackagingExpert`;
  }
}
