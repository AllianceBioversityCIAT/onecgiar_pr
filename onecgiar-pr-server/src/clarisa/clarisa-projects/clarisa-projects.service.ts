import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaProjectsRepository } from './clarisa-projects.repository';
import { ClarisaCenter } from '../clarisa-centers/entities/clarisa-center.entity';
import {
  buildCenterIndex,
  resolveProjectOwnerCenter,
} from '../../api/bilateral/utils/project-owner-center.util';

@Injectable()
export class ClarisaProjectsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaProjectsRepository: ClarisaProjectsRepository,
    @InjectRepository(ClarisaCenter)
    private readonly _clarisaCenterRepository: Repository<ClarisaCenter>,
  ) {}

  async findAll() {
    try {
      const clarisaProjects = await this._clarisaProjectsRepository.find({
        relations: {
          obj_organization: true,
        },
      });

      // @akili-spec notifications/bilateral-contributor-tagging
      // BCT-T-2 / BCT-DD-4: additive `owner_center_institution_id` per project, so the
      // client can lock a derived Center before any save. One Center-index load per
      // call (BCT-NFR-5), then the T1 resolver in memory for every row.
      const centerIndex = buildCenterIndex(
        await this._clarisaCenterRepository.find(),
      );
      const response = clarisaProjects.map((project) => ({
        ...project,
        owner_center_institution_id:
          resolveProjectOwnerCenter(project, centerIndex)?.institutionId ??
          null,
      }));

      return {
        response,
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
