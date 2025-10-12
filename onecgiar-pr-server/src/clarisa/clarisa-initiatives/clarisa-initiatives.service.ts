import { Injectable, HttpStatus, BadRequestException } from '@nestjs/common';
import { In } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInitiativesRepository } from './ClarisaInitiatives.repository';

type InitiativeWhere = {
  portfolio_id: number;
  cgiar_entity_type_id?: ReturnType<typeof In>;
};

@Injectable()
export class ClarisaInitiativesService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
  ) {}

  async getAllInitiativesWithoutCurrentInitiative(
    resultId: number,
    portfolio?: string,
  ) {
    try {
      const key = (portfolio || '').toString().toLowerCase();
      const map: Record<string, number> = { p22: 2, p25: 3 };
      const portfolio_id = map[key];

      const initiative =
        await this._clarisaInitiativesRepository.getAllInitiativesWithoutCurrentInitiative(
          resultId,
          portfolio_id,
        );
      if (!initiative.length) {
        throw {
          response: {},
          message: 'Initiative Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: initiative,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findAll() {
    try {
      const inititatives =
        await this._clarisaInitiativesRepository.getAllInitiatives();
      return {
        response: inititatives,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getByPortfolio(portfolio: string) {
    try {
      const key = (portfolio || '').toString().toLowerCase();
      const map: Record<string, number> = { p22: 2, p25: 3 };
      const portfolio_id = map[key];

      if (!portfolio_id) {
        throw new BadRequestException(
          `Invalid portfolio parameter: ${portfolio}. Use 'p22' or 'p25'.`,
        );
      }

      const where: InitiativeWhere = { portfolio_id };
      if (key === 'p25') {
        where.cgiar_entity_type_id = In([22, 23, 24]);
      }

      const items = await this._clarisaInitiativesRepository.find({
        where,
        order: { id: 'ASC' },
        relations: ['obj_cgiar_entity_type'],
      });

      return {
        response: items,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getInitiativesEntitiesGrouped() {
    try {
      const p22 = await this._clarisaInitiativesRepository.find({
        where: {
          portfolio_id: 2,
          active: true,
          cgiar_entity_type_id: In([6, 9, 10]),
        },
        order: { id: 'ASC' },
      });
      const p25 = await this._clarisaInitiativesRepository.find({
        where: {
          portfolio_id: 3,
          active: true,
          cgiar_entity_type_id: In([22, 23, 24]),
        },
        order: { id: 'ASC' },
      });

      const result = [
        {
          name: 'P22',
          isLabel: true,
          entities: [
            ...p22.map((item) => ({
              initiative_id: item.id,
              full_name: item.name,
              ...item,
            })),
          ],
        },
        {
          name: 'P25',
          isLabel: true,
          entities: [
            ...p25.map((item) => ({
              initiative_id: item.id,
              full_name: item.name,
              ...item,
            })),
          ],
        },
      ];

      return {
        response: result,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
