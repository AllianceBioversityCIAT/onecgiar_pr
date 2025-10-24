import { Injectable } from '@nestjs/common';

@Injectable()
export class GeoScopeRoleService {
  findAll() {
    return `This action returns all geoScopeRole`;
  }

  findOne(id: number) {
    return `This action returns a #${id} geoScopeRole`;
  }

  remove(id: number) {
    return `This action removes a #${id} geoScopeRole`;
  }
}
