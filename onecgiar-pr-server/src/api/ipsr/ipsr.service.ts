import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { CreateIpsrDto } from './dto/create-ipsr.dto';
import { UpdateIpsrDto } from './dto/update-ipsr.dto';
import { IpsrRepository } from './ipsr.repository';

@Injectable()
export class IpsrService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _ipsrRespository: IpsrRepository
  ) { }

  create(createIpsrDto: CreateIpsrDto) {
    return 'This action adds a new ipsr';
  }

  async findAllInnovations() {
    try {
      const innovation = await this._ipsrRespository.getResultsInnovation();
      return {
        response: innovation,
        message: 'Successful response',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true })
    }
  }

  async findOneInnovation(resultId: number) {
    try {
      const result = await this._ipsrRespository.getResultInnovationById(resultId);
      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true })
    }
  }

  update(id: number, updateIpsrDto: UpdateIpsrDto) {
    return `This action updates a #${id} ipsr`;
  }

  remove(id: number) {
    return `This action removes a #${id} ipsr`;
  }
}
