import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateTocResultDto } from './dto/create-toc-result.dto';
import { UpdateTocResultDto } from './dto/update-toc-result.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TocResultsRepository } from './toc-results.repository';

@Injectable()
export class TocResultsService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _tocResultsRepository: TocResultsRepository
  ){}

  create(createTocResultDto: CreateTocResultDto) {
    return 'This action adds a new tocResult';
  }

  findAll() {
    return `This action returns all tocResults`;
  }

  async findAllByinitiativeId(initiativeId: number, levelId: number) {
    try {
      let tocResults = await this._tocResultsRepository.getAllTocResultsByInitiative(initiativeId, levelId);

      if(!tocResults.length && levelId == 4){
        tocResults = await this._tocResultsRepository.getAllOutcomeByInitiative(initiativeId);
      }
      if(!tocResults.length){
        throw {
          response: {},
          message: 'ToC Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: tocResults,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findFullInitiativeTocByResult(resultId: number) {
    try {
      const tocResults = await this._tocResultsRepository.getFullInitiativeTocByResult(resultId);
      if(!tocResults.length){
        throw {
          response: {},
          message: 'ToC Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: tocResults,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  update(id: number, updateTocResultDto: UpdateTocResultDto) {
    return `This action updates a #${id} tocResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} tocResult`;
  }
}
