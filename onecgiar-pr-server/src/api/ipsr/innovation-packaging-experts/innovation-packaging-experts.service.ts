import { Injectable } from '@nestjs/common';
import { CreateInnovationPackagingExpertDto } from './dto/create-innovation-packaging-expert.dto';
import { UpdateInnovationPackagingExpertDto } from './dto/update-innovation-packaging-expert.dto';
import { InnovationPackagingExpertRepository } from './repositories/innovation-packaging-expert.repository';
import { ExpertisesRepository } from './repositories/expertises.repository';

@Injectable()
export class InnovationPackagingExpertsService {

  constructor(
    protected readonly _innovationPackagingExpertRepository: InnovationPackagingExpertRepository,
    protected readonly _expertisesRepository: ExpertisesRepository
  ){}

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
