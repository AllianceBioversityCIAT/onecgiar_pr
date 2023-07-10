import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaTocPhaseDto } from './dto/create-clarisa-toc-phase.dto';
import { UpdateClarisaTocPhaseDto } from './dto/update-clarisa-toc-phase.dto';
import { ClarisaTocPhaseRepository } from './clarisa-toc-phases.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { env } from 'process';

@Injectable()
export class ClarisaTocPhasesService {
  constructor(
    private readonly _clarisaTocPhaseRepository: ClarisaTocPhaseRepository,
    private readonly _returnResponse: ReturnResponse,
  ) {}

  create(createClarisaTocPhaseDto: CreateClarisaTocPhaseDto) {
    return 'This action adds a new clarisaTocPhase';
  }

  async findAll() {
    try {
      const res = await this._clarisaTocPhaseRepository.find({
        where: {
          active: true,
        },
      });
      return this._returnResponse.format({
        response: res,
        message: 'ToC phases found successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaTocPhase`;
  }

  update(id: number, updateClarisaTocPhaseDto: UpdateClarisaTocPhaseDto) {
    return `This action updates a #${id} clarisaTocPhase`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaTocPhase`;
  }
}
