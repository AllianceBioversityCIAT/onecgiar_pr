import { Injectable, HttpStatus } from '@nestjs/common';
import { NonPooledProject } from './entities/non-pooled-project.entity';
import { NonPooledProjectRepository } from './non-pooled-projects.repository';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { returnFormatService } from '../../../shared/extendsGlobalDTO/returnServices.dto';

@Injectable()
export class NonPooledProjectsService {
  constructor(
    protected readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    protected readonly _handlersError: HandlersError,
  ) {}

  async update(
    id: number,
    nonpp: NonPooledProject,
  ): Promise<returnFormatService> {
    try {
      const existnpp = await this._nonPooledProjectRepository.findOne({
        where: { id: id, is_active: true },
      });
      if (!existnpp) {
        throw {
          response: id,
          message: 'Non-Pooled Project not found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      await this._nonPooledProjectRepository.update(existnpp.id, {
        center_grant_id: nonpp.center_grant_id,
        grant_title: nonpp.grant_title,
        funder_institution_id: nonpp.funder_institution_id,
        lead_center_id: nonpp.lead_center_id,
      });

      return {
        response: {
          ...existnpp,
          center_grant_id: nonpp.center_grant_id,
          grant_title: nonpp.grant_title,
          funder_institution_id: nonpp.funder_institution_id,
          lead_center_id: nonpp.lead_center_id,
        },
        message: 'The Non-Pooled Project has been updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
