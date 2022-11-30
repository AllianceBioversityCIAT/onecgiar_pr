import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaMeliaStudyTypeRepository } from './ClariasaMeliasStudyType.repository';
import { CreateClarisaMeliaStudyTypeDto } from './dto/create-clarisa-melia-study-type.dto';
import { UpdateClarisaMeliaStudyTypeDto } from './dto/update-clarisa-melia-study-type.dto';

@Injectable()
export class ClarisaMeliaStudyTypeService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaMeliaStudyTypeRepository: ClarisaMeliaStudyTypeRepository,
  ) {}

  create(createClarisaMeliaStudyTypeDto: CreateClarisaMeliaStudyTypeDto) {
    return 'This action adds a new clarisaMeliaStudyType';
  }

  async findAll() {
    try {
      const meliaTypes = await this._clarisaMeliaStudyTypeRepository.find();
      return {
        response: meliaTypes,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes(error);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaMeliaStudyType`;
  }

  update(
    id: number,
    updateClarisaMeliaStudyTypeDto: UpdateClarisaMeliaStudyTypeDto,
  ) {
    return `This action updates a #${id} clarisaMeliaStudyType`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaMeliaStudyType`;
  }
}
