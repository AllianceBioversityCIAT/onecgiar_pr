import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaSdgsTarget } from './entities/clarisa-sdgs-target.entity';

@Injectable()
export class ClarisaSdgsTargetsRepository extends Repository<ClarisaSdgsTarget> {
    constructor(private dataSource: DataSource) {
        super(ClarisaSdgsTarget, dataSource.createEntityManager());
    }


    async deleteAllData() {
        const queryData = `
            DELETE FROM clarisa_sdgs_targets;
            `;
        try {
            const deleteData = await this.query(queryData);
            return deleteData;
        } catch (error) {
            throw {
                message: `[${ClarisaSdgsTarget.name}] => deleteAllData error: ${error}`,
                response: {},
                status: HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
    }
}
