import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaSdg } from './entities/clarisa-sdg.entity';

@Injectable()
export class ClarisaSdgsRepository extends Repository<ClarisaSdg> {
    constructor(private dataSource: DataSource) {
        super(ClarisaSdg, dataSource.createEntityManager());
    }


    async deleteAllData() {
        const queryData = `
            DELETE FROM clarisa_sdgs;
            `;
        try {
            const deleteData = await this.query(queryData);
            return deleteData;
        } catch (error) {
            throw {
                message: `[${ClarisaSdgsRepository.name}] => deleteAllData error: ${error}`,
                response: {},
                status: HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
}
