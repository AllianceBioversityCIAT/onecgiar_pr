import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaCenterDto } from './dto/create-clarisa-center.dto';
import { UpdateClarisaCenterDto } from './dto/update-clarisa-center.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaCentersRepository } from './clarisa-centers.repository';

@Injectable()
export class ClarisaCentersService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaCentersRepository: ClarisaCentersRepository
  ){}

  create(createClarisaCenterDto: CreateClarisaCenterDto) {
    return 'This action adds a new clarisaCenter';
  }

  async findAll() {
    try {
      const clarisaCenter = await this._clarisaCentersRepository.getAllCenters();

      if(!clarisaCenter.length){
        throw {
          response: {},
          message: 'Centers Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: clarisaCenter,
        message: 'Validates correctly with CLARISA',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaCenter`;
  }

  update(id: number, updateClarisaCenterDto: UpdateClarisaCenterDto) {
    return `This action updates a #${id} clarisaCenter`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaCenter`;
  }
}
