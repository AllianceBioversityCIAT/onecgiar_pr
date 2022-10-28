import { Injectable } from '@nestjs/common';
import { CreateClarisaGeographicScopeDto } from './dto/create-clarisa-geographic-scope.dto';
import { UpdateClarisaGeographicScopeDto } from './dto/update-clarisa-geographic-scope.dto';

@Injectable()
export class ClarisaGeographicScopesService {
  create(createClarisaGeographicScopeDto: CreateClarisaGeographicScopeDto) {
    return 'This action adds a new clarisaGeographicScope';
  }

  findAll() {
    return `This action returns all clarisaGeographicScopes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaGeographicScope`;
  }

  update(id: number, updateClarisaGeographicScopeDto: UpdateClarisaGeographicScopeDto) {
    return `This action updates a #${id} clarisaGeographicScope`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaGeographicScope`;
  }
}
