import { Injectable, HttpStatus } from '@nestjs/common';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaProjectsRepository } from './clarisa-projects.repository';

@Injectable()
export class ClarisaProjectsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaProjectsRepository: ClarisaProjectsRepository,
  ) {}

  async findAll() {
    try {
      const clarisaProjects = await this._clarisaProjectsRepository.find();

      return {
        response: clarisaProjects,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ClarisaProjectsService.name,
        error: error,
        debug: true,
      });
    }
  }
}
