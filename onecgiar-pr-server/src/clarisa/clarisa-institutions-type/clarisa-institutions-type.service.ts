import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateClarisaInstitutionsTypeDto } from './dto/create-clarisa-institutions-type.dto';
import { UpdateClarisaInstitutionsTypeDto } from './dto/update-clarisa-institutions-type.dto';
import { ClarisaInstitutionsTypeRepository } from './ClariasaInstitutionsType.repository';
import { IsNull } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ClarisaInstitutionsTypeService {

  constructor(
    protected readonly _clarisaInstitutionsTypeRepository: ClarisaInstitutionsTypeRepository,
    private readonly _handlersError: HandlersError,
  ){}

  create(createClarisaInstitutionsTypeDto: CreateClarisaInstitutionsTypeDto) {
    return 'This action adds a new clarisaInstitutionsType';
  }

  async findAllNotLegacy() {
    try {
      const dataParent = await this._clarisaInstitutionsTypeRepository.find({
        where: {
          is_legacy: false,
          id_parent: IsNull()
        }, 
        relations:{ 
          children: {
            children: true
          }
        }
      });
      dataParent.map(el => {
        el['childrens'] = el.children.map(es => {
          return es.children.map(et => {
            delete et.id_parent;
            return et;
          });
        }).flat();
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

  findOne(id: number) {
    return `This action returns a #${id} clarisaInstitutionsType`;
  }

  update(
    id: number,
    updateClarisaInstitutionsTypeDto: UpdateClarisaInstitutionsTypeDto,
  ) {
    return `This action updates a #${id} clarisaInstitutionsType`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInstitutionsType`;
  }
}
