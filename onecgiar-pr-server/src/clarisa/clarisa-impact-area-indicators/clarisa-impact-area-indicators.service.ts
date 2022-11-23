import { Injectable, HttpStatus } from '@nestjs/common';
import { ClarisaImpactAreaInticatorsRepository } from './ClarisaImpactAreaIndicators.repository';
import { CreateClarisaImpactAreaIndicatorDto } from './dto/create-clarisa-impact-area-indicator.dto';
import { UpdateClarisaImpactAreaIndicatorDto } from './dto/update-clarisa-impact-area-indicator.dto';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaImpactAreaIndicatorsService {

  constructor(
    private readonly _clarisaImpactAreaInticatorsRepository: ClarisaImpactAreaInticatorsRepository,
    private readonly _handlersError: HandlersError
  ){}

  create(
    createClarisaImpactAreaIndicatorDto: CreateClarisaImpactAreaIndicatorDto,
  ) {
    return createClarisaImpactAreaIndicatorDto;
  }

  async findAll() {
    try {
      const carisaImpactIndicators = await this._clarisaImpactAreaInticatorsRepository.getAllImpactAreaIndicators();

      return {
        response: carisaImpactIndicators,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({error, debug: true});
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaImpactAreaIndicator`;
  }

  update(
    id: number,
    updateClarisaImpactAreaIndicatorDto: UpdateClarisaImpactAreaIndicatorDto,
  ) {
    return `This action updates a #${id} clarisaImpactAreaIndicator ${updateClarisaImpactAreaIndicatorDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaImpactAreaIndicator`;
  }
}
