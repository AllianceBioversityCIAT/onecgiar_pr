import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaPolicyTypeDto } from './dto/create-clarisa-policy-type.dto';
import { UpdateClarisaPolicyTypeDto } from './dto/update-clarisa-policy-type.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaPolicyTypeRepository } from './clarisa-policy-types.repository';

@Injectable()
export class ClarisaPolicyTypesService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaPolicyTypeRepository: ClarisaPolicyTypeRepository
  ){}
  create(createClarisaPolicyTypeDto: CreateClarisaPolicyTypeDto) {
    return 'This action adds a new clarisaPolicyType';
  }

  async findAll() {
    try {
      const clarisaPolicyType = await this._clarisaPolicyTypeRepository.find();
      
      return {
        response: clarisaPolicyType,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({error, debug: true})
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaPolicyType`;
  }

  update(id: number, updateClarisaPolicyTypeDto: UpdateClarisaPolicyTypeDto) {
    return `This action updates a #${id} clarisaPolicyType`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaPolicyType`;
  }
}
