import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateYearDto } from './dto/create-year.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { YearRepository } from './year.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { IsNull } from 'typeorm';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { EnvironmentExtractor } from '../../../shared/utils/environment-extractor';

@Injectable()
export class YearsService {
  constructor(
    private readonly _yearRepository: YearRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _handlersError: HandlersError,
    private readonly _returnResponse: ReturnResponse,
  ) {}

  async create(year: string, user: TokenDto, options?: CreateYearDto) {
    try {
      const userRole = await this._roleByUserRepository.findOne({
        where: {
          user: user.id,
          action_area_id: IsNull(),
          initiative_id: IsNull(),
          role: 1,
        },
      });
      if (!userRole) {
        throw {
          response: user,
          message:
            'The user does not have the necessary permissions for this action, please contact the technical team.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }
      const yearExists = await this._yearRepository.findOne({
        where: { year: +year },
      });
      if (yearExists) {
        throw {
          response: yearExists,
          message: 'The year already exists, please choose a different year.',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      const currentYear = await this._yearRepository.findOne({
        where: { active: true },
      });
      const newYear = await this._yearRepository.create({
        year: +year,
        start_date: options?.start_date || null,
        end_date: options?.end_date || null,
        active: options?.set_active_year || false,
      });

      if (options?.set_active_year) {
        await this._yearRepository.update(currentYear.year, {
          active: false,
        });
      }

      return {
        response: newYear,
        message: 'The year has been created successfully.',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async activeYear(year: string, user: TokenDto) {
    try {
      const userRole = await this._roleByUserRepository.findOne({
        where: {
          user: user.id,
          action_area_id: IsNull(),
          initiative_id: IsNull(),
          role: 1,
        },
      });
      if (!userRole) {
        throw {
          response: user,
          message:
            'The user does not have the necessary permissions for this action, please contact the technical team.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      const yearExists = await this._yearRepository.findOne({
        where: { year: +year },
      });
      if (!yearExists) {
        throw {
          response: yearExists,
          message: 'The year does not exist.',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const oldYear = await this._yearRepository.findOne({
        where: { active: true },
      });
      if (oldYear.year == yearExists.year) {
        throw {
          response: yearExists,
          message: 'The year is already active.',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      await this._yearRepository.update(oldYear.year, {
        active: false,
      });

      await this._yearRepository.update(yearExists.year, {
        active: true,
      });

      return {
        response: {
          newYear: yearExists,
          oldYear: oldYear,
        },
        message: 'The year has been activated successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findAllYear() {
    try {
      const years = await this._yearRepository.find();

      return this._returnResponse.format({
        response: years,
        message: 'The years have been found successfully.',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }
}
