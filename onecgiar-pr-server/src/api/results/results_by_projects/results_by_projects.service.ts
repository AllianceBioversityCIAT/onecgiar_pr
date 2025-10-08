import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByProjectsRepository } from './results_by_projects.repository';

@Injectable()
export class ResultsByProjectsService {
  private readonly _logger = new Logger(ResultsByProjectsService.name);

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultsByProjectsRepository: ResultsByProjectsRepository,
  ) {}

  async linkBilateralProjectToResult(
    resultId: number,
    projectId: number | string,
    user: number,
  ) {
    const normalizedProjectId = Number(projectId);

    if (!Number.isFinite(normalizedProjectId) || normalizedProjectId <= 0) {
      return {
        response: null,
        message: 'No bilateral project was provided.',
        status: HttpStatus.OK,
      };
    }
    try {
      const existingLink = await this._resultsByProjectsRepository.findOne({
        where: {
          result_id: resultId,
          project_id: normalizedProjectId,
        },
      });

      if (existingLink) {
        if (!existingLink.is_active || existingLink.last_updated_by !== user) {
          existingLink.is_active = true;
          existingLink.last_updated_by = user;
          await this._resultsByProjectsRepository.save(existingLink);

          return {
            response: existingLink,
            message: 'Link reactivated successfully',
            status: HttpStatus.OK,
          };
        }

        return {
          response: existingLink,
          message: 'The link between the result and project already exists',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const newLink = this._resultsByProjectsRepository.create({
        result_id: resultId,
        project_id: normalizedProjectId,
        is_active: true,
        created_by: user,
        last_updated_by: user,
      });
      await this._resultsByProjectsRepository.save(newLink);

      return {
        response: newLink,
        message: 'Link created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
