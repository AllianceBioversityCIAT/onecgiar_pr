import { Injectable, HttpStatus } from '@nestjs/common';
import { ClarisaInstitutionsTypeRepository } from './ClariasaInstitutionsType.repository';
import { IsNull } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaInstitutionsTypeService {
  constructor(
    protected readonly _clarisaInstitutionsTypeRepository: ClarisaInstitutionsTypeRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async findAllNotLegacy() {
    try {
      const dataParent = await this._clarisaInstitutionsTypeRepository.find({
        where: {
          is_legacy: false,
          id_parent: IsNull(),
        },
        relations: {
          children: {
            children: true,
          },
        },
      });
      dataParent.map((el) => {
        el['childrens'] = el.children
          .map((es) => {
            if (!es.children.length) return es;
            return es.children.map((et) => {
              delete et.id_parent;
              return et;
            });
          })
          .flat();
        delete el.id_parent;
        delete el.children;
      });

      return {
        response: dataParent,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
