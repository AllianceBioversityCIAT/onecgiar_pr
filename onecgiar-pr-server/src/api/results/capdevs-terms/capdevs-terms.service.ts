import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateCapdevsTermDto } from './dto/create-capdevs-term.dto';
import { UpdateCapdevsTermDto } from './dto/update-capdevs-term.dto';
import { CapdevsTermRepository } from './capdevs-terms.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class CapdevsTermsService {
  constructor(
    private readonly _capdevsTermRepository: CapdevsTermRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  create(createCapdevsTermDto: CreateCapdevsTermDto) {
    return 'This action adds a new capdevsTerm';
  }

  async findAll() {
    try {
      const capdevsTerm = await this._capdevsTermRepository.find();
      return {
        response: capdevsTerm,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} capdevsTerm`;
  }

  update(id: number, updateCapdevsTermDto: UpdateCapdevsTermDto) {
    return `This action updates a #${id} capdevsTerm`;
  }

  remove(id: number) {
    return `This action removes a #${id} capdevsTerm`;
  }
}
