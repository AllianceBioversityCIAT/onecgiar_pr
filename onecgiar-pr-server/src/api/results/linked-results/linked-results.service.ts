import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateLinkedResultDto } from './dto/create-linked-result.dto';
import { UpdateLinkedResultDto } from './dto/update-linked-result.dto';
import { LinkedResultRepository } from './linked-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { Result } from '../entities/result.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { LinkedResult } from './entities/linked-result.entity';

@Injectable()
export class LinkedResultsService {
  constructor(
    private readonly _linkedResultRepository: LinkedResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository
  ){}
  async create(createLinkedResultDto: CreateLinkedResultDto, user: TokenDto) {
    try {
      if (!createLinkedResultDto?.result_id) {
        throw {
          response: {},
          message: 'Missing data in the request',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      
      const result: Result = await this._resultRepository.getResultById(createLinkedResultDto.result_id);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if(createLinkedResultDto?.links?.length){
        const links: interfaceLinkResults[]  = createLinkedResultDto.links;
        const newLinks: LinkedResult[] = [];
        for (let index = 0; index < links.length; index++) {
          await this._linkedResultRepository.updateLink(createLinkedResultDto.result_id,links.map(e => e.id),user.id);
          const linkExists = await this._linkedResultRepository.getLinkResultByIdResultAndLinkId(result.id, links[index].id);
          if(!linkExists){
            const newLink = new LinkedResult();
            newLink.created_by = user.id;
            newLink.last_updated_by = user.id;
            newLink.origin_result_id = result.id;
            newLink.linked_results_id = links[index].id;
            newLinks.push(newLink);
          }
        }
        await this._linkedResultRepository.save(newLinks);

      }else{
        await this._linkedResultRepository.updateLink(createLinkedResultDto.result_id,[],user.id);
      }
      return {
        response: {},
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllLinksByResult(resultId: number) {
    try {
      const linsk = await this._linkedResultRepository.getLinkResultByIdResult(resultId);
      if(!linsk.length){
        throw {
          response: {},
          message: 'Links Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: linsk,
        message: 'The data was updated correctly',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} linkedResult`;
  }

  update(id: number, updateLinkedResultDto: UpdateLinkedResultDto) {
    return `This action updates a #${id} linkedResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} linkedResult`;
  }
}

interface interfaceLinkResults{
  id: number;
}