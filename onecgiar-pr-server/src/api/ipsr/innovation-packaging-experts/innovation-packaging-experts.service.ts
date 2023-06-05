import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateInnovationPackagingExpertDto } from './dto/create-innovation-packaging-expert.dto';
import { UpdateInnovationPackagingExpertDto } from './dto/update-innovation-packaging-expert.dto';
import { InnovationPackagingExpertRepository } from './repositories/innovation-packaging-expert.repository';
import { ExpertisesRepository } from './repositories/expertises.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class InnovationPackagingExpertsService {
  constructor(
    protected readonly _innovationPackagingExpertRepository: InnovationPackagingExpertRepository,
    protected readonly _expertisesRepository: ExpertisesRepository,
    protected readonly _handlersError: HandlersError,
  ) {}

  create(
    createInnovationPackagingExpertDto: CreateInnovationPackagingExpertDto,
  ) {
    return 'This action adds a new innovationPackagingExpert';
  }

  findAll() {
    return `This action returns all innovationPackagingExperts`;
  }

  async findAllExpertises() {
    try {
      const request = await this._expertisesRepository.find({
        order: { order: 'ASC' },
      });
      return {
        response: request,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} innovationPackagingExpert`;
  }

  update(
    id: number,
    updateInnovationPackagingExpertDto: UpdateInnovationPackagingExpertDto,
  ) {
    return `This action updates a #${id} innovationPackagingExpert`;
  }

  remove(id: number) {
    return `This action removes a #${id} innovationPackagingExpert`;
  }
}
