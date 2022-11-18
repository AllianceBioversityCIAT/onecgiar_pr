import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaInnovationTypeDto } from './dto/create-clarisa-innovation-type.dto';
import { UpdateClarisaInnovationTypeDto } from './dto/update-clarisa-innovation-type.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInnovationTypeRepository } from './clarisa-innovation-type.repository';

@Injectable()
export class ClarisaInnovationTypeService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInnovationTypeRepository: ClarisaInnovationTypeRepository
  ){}

  create(createClarisaInnovationTypeDto: CreateClarisaInnovationTypeDto) {
    return 'This action adds a new clarisaInnovationType';
  }

  async findAll() {
    try {
      const innocationType = await this._clarisaInnovationTypeRepository.find();
      
      return {
        response: innocationType,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({error, debug: true})
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInnovationType`;
  }

  update(id: number, updateClarisaInnovationTypeDto: UpdateClarisaInnovationTypeDto) {
    return `This action updates a #${id} clarisaInnovationType`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInnovationType`;
  }
}
