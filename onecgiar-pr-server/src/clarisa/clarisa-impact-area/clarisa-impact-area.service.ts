import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateClarisaImpactAreaDto } from './dto/create-clarisa-impact-area.dto';
import { UpdateClarisaImpactAreaDto } from './dto/update-clarisa-impact-area.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaImpactAreaRepository } from './ClarisaImpactArea.repository';

@Injectable()
export class ClarisaImpactAreaService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaImpactAreaRepository: ClarisaImpactAreaRepository
  ){}

  create(createClarisaImpactAreaDto: CreateClarisaImpactAreaDto) {
    return 'This action adds a new clarisaImpactArea';
  }

  async findAll() {
    try {
      const carisaImpactArea = await this._clarisaImpactAreaRepository.getAllImpactArea();

      return {
        response: carisaImpactArea,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._handlersError.returnErrorRes({error, debug: true});
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaImpactArea`;
  }

  update(id: number, updateClarisaImpactAreaDto: UpdateClarisaImpactAreaDto) {
    return `This action updates a #${id} clarisaImpactArea`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaImpactArea`;
  }
}
