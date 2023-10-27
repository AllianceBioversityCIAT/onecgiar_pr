import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInnovationCharacteristic } from './entities/clarisa-innovation-characteristic.entity';

@Injectable()
export class ClarisaInnovationCharacteristicRepository extends Repository<ClarisaInnovationCharacteristic> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInnovationCharacteristic, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_innovation_characteristic;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaInnovationCharacteristicRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
