import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByProjectsRepository } from './results_by_projects.repository';
import { In } from 'typeorm';

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

  async syncBilateralProjects(
    resultId: number,
    incomingProjects: Array<number | string | { project_id: number | string }>,
    userId: number,
  ) {
    try {
      const incomingIds = Array.from(
        new Set(
          (incomingProjects || [])
            .map((p: any) => (typeof p === 'object' ? p.project_id : p))
            .map((v) => Number(v))
            .filter((n) => Number.isFinite(n) && n > 0),
        ),
      );

      const existingActive = await this._resultsByProjectsRepository.find({
        where: { result_id: resultId, is_active: true },
      });
      const toDisable = existingActive.filter(
        (row) => !incomingIds.includes(Number(row.project_id)),
      );
      if (toDisable.length) {
        await this._resultsByProjectsRepository.update(
          { id: In(toDisable.map((r) => r.id)) },
          { is_active: false, last_updated_by: userId },
        );
      }

      let created = 0;
      let reactivated = 0;
      let unchanged = 0;

      for (const pid of incomingIds) {
        const res = await this.linkBilateralProjectToResult(
          resultId,
          pid,
          userId,
        );
        if (res.status === HttpStatus.CREATED) created += 1;
        else if (
          res.status === HttpStatus.OK &&
          res.message.includes('reactivated')
        )
          reactivated += 1;
        else if (
          res.status === HttpStatus.BAD_REQUEST &&
          res.message.includes('already exists')
        )
          unchanged += 1;
        else if (res.status >= 400) {
          throw new Error(`Failed linking project ${pid}: ${res.message}`);
        }
      }

      return {
        response: {
          result_id: resultId,
          set_active: incomingIds,
          deactivated: toDisable.map((r) => Number(r.project_id)),
          summary: {
            created,
            reactivated,
            unchanged,
            deactivated: toDisable.length,
          },
        },
        message: 'Bilateral projects synced successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async find(options?: any) {
    try {
      return await this._resultsByProjectsRepository.find(options);
    } catch (error) {
      this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
