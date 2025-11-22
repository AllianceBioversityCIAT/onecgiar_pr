import { Injectable } from '@nestjs/common';

@Injectable()
export class IpsrFrameworkService {
  create() {
    return 'This action adds a new ipsrFramework';
  }

  findAll() {
    return `This action returns all ipsrFramework`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ipsrFramework`;
  }

  update(id: number) {
    return `This action updates a #${id} ipsrFramework`;
  }

  remove(id: number) {
    return `This action removes a #${id} ipsrFramework`;
  }
}
