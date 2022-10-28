import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaRegionDto } from './dto/create-clarisa-region.dto';
import { UpdateClarisaRegionDto } from './dto/update-clarisa-region.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaRegionsRepository } from './ClariasaRegions.repository';

@Injectable()
export class ClarisaRegionsService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaRegionsRepository: ClarisaRegionsRepository
  ){}

  create(createClarisaRegionDto: CreateClarisaRegionDto) {
    return 'This action adds a new clarisaRegion';
  }

  async findAllNoParent() {
    try {
      const region = await this._clarisaRegionsRepository.getAllNoParentRegions();
      return {
        response: region,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes(error);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaRegion`;
  }

  update(id: number, updateClarisaRegionDto: UpdateClarisaRegionDto) {
    return `This action updates a #${id} clarisaRegion`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaRegion`;
  }
}
