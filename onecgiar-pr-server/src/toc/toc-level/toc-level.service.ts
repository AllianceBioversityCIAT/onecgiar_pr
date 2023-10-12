import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateTocLevelDto } from './dto/create-toc-level.dto';
import { UpdateTocLevelDto } from './dto/update-toc-level.dto';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TocLevelRepository } from './toc-level.repository';

@Injectable()
export class TocLevelService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _tocLevelRepository: TocLevelRepository,
  ) {}

  create(createTocLevelDto: CreateTocLevelDto) {
    return 'This action adds a new tocLevel';
  }

  async findAll() {
    try {
      const tocResults = await this._tocLevelRepository.getAllTocLevel();
      if (!tocResults.length) {
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

  findOne(id: number) {
    return `This action returns a #${id} tocLevel`;
  }

  update(id: number, updateTocLevelDto: UpdateTocLevelDto) {
    return `This action updates a #${id} tocLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} tocLevel`;
  }
}
