import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaInnovationUseLevelDto } from './dto/create-clarisa-innovation-use-level.dto';
import { UpdateClarisaInnovationUseLevelDto } from './dto/update-clarisa-innovation-use-level.dto';
import { ClarisaInnovationUseLevelRepository } from './clarisa-innovation-use-levels.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaInnovationUseLevelsService {

  constructor(
    private readonly _clarisaInnovationUseLevelRepository: ClarisaInnovationUseLevelRepository,
    private readonly _handlersError: HandlersError
  ) { }

  create(createClarisaInnovationUseLevelDto: CreateClarisaInnovationUseLevelDto) {
    return 'This action adds a new clarisaInnovationUseLevel';
  }

  async findAll() {
    try {
      const response = await this._clarisaInnovationUseLevelRepository.find();
      if (!response.length) {
        throw {
          response: {},
          message: 'No innovation use levels were found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: response,
        message: 'All innovation use levels were found',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({
        error,
        debug: true,
      });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInnovationUseLevel`;
  }

  update(id: number, updateClarisaInnovationUseLevelDto: UpdateClarisaInnovationUseLevelDto) {
    return `This action updates a #${id} clarisaInnovationUseLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInnovationUseLevel`;
  }
}
