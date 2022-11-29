import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaInnovationReadinessLevelDto } from './dto/create-clarisa-innovation-readiness-level.dto';
import { UpdateClarisaInnovationReadinessLevelDto } from './dto/update-clarisa-innovation-readiness-level.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInnovationReadinessLevelRepository } from './clarisa-innovation-readiness-levels.repository';

@Injectable()
export class ClarisaInnovationReadinessLevelsService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInnovationReadinessLevelRepository: ClarisaInnovationReadinessLevelRepository
  ){}

  create(createClarisaInnovationReadinessLevelDto: CreateClarisaInnovationReadinessLevelDto) {
    return 'This action adds a new clarisaInnovationReadinessLevel';
  }

  async findAll() {
    try {
      const InnovationReadinessLevel = await this._clarisaInnovationReadinessLevelRepository.find();
      
      return {
        response: InnovationReadinessLevel,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({error, debug: true})
    }
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
