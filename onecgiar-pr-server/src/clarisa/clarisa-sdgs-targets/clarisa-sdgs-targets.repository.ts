import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaSdgsTarget } from './entities/clarisa-sdgs-target.entity';

@Injectable()
export class ClarisaSdgsTargetsRepository extends Repository<ClarisaSdgsTarget> {
    constructor(private dataSource: DataSource) {
        super(ClarisaSdgsTarget, dataSource.createEntityManager());
    }

    async Sdgs() {
        const sdgOneQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 1;
        `;

        const sdgTwoQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 2;
        `;

        const sdgThreeQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 3;
        `;

        const sdgFourQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 4;
        `;

        const sdgFiveQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 5;
        `;

        const sdgSixQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 6;
        `;

        const sdgSevenQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 7;
        `;

        const sdgEightQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 8;
        `;

        const sdgNineQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 9;
        `;

        const sdgTenQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 10;
        `;

        const sdgElevenQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 11;
        `;

        const sdgTwelveQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 12;
        `;

        const sdgThirteenQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 13;
        `;

        const sdgFourteenQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 14;
        `;

        const sdgFifteenQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 15;
        `;

        const sdgSixteenQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 16;
        `;

        const sdgSeventeenQuery = `
        SELECT
            *
        FROM 
            clarisa_sdgs_targets
        WHERE usnd_code = 17;
        `;

        const sdgNameQuery = `
        SELECT
            usnd_code,
            short_name
        FROM 
            clarisa_sdgs;
        `;

        try {
            const sdgOne = await this.query(sdgOneQuery);
            const sdgTwo = await this.query(sdgTwoQuery);
            const sdgThree = await this.query(sdgThreeQuery);
            const sdgFour = await this.query(sdgFourQuery);
            const sdgFive = await this.query(sdgFiveQuery);
            const sdgSix = await this.query(sdgSixQuery);
            const sdgSeven = await this.query(sdgSevenQuery);
            const sdgEight = await this.query(sdgEightQuery);
            const sdgNine = await this.query(sdgNineQuery);
            const sdgTen = await this.query(sdgTenQuery);
            const sdgEleven = await this.query(sdgElevenQuery);
            const sdgTwelve = await this.query(sdgTwelveQuery);
            const sdgThirteen = await this.query(sdgThirteenQuery);
            const sdgFourteen = await this.query(sdgFourteenQuery);
            const sdgFifteen = await this.query(sdgFifteenQuery);
            const sdgSixteen = await this.query(sdgSixteenQuery);
            const sdgSeventeen = await this.query(sdgSeventeenQuery);

            const sdgNameList = await this.query(sdgNameQuery);

            return [
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 1),
                    sdgList: sdgOne
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 2),
                    sdgList: sdgTwo
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 3),
                    sdgList: sdgThree
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 4),
                    sdgList: sdgFour
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 5),
                    sdgList: sdgFive
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 6),
                    sdgList: sdgSix
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 7),
                    sdgList: sdgSeven
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 8),
                    sdgList: sdgEight
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 9),
                    sdgList: sdgNine
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 10),
                    sdgList: sdgTen
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 11),
                    sdgList: sdgEleven
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 12),
                    sdgList: sdgTwelve
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 13),
                    sdgList: sdgThirteen
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 14),
                    sdgList: sdgFourteen
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 15),
                    sdgList: sdgFifteen
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 16),
                    sdgList: sdgSixteen
                },
                {
                    sdg: sdgNameList.find(sdg => sdg.usnd_code == 17),
                    sdgList: sdgSeventeen
                }
            ];
        } catch (error) {
            throw {
                message: `[${ClarisaSdgsTarget.name}] => deleteAllData error: ${error}`,
                response: {},
                status: HttpStatus.INTERNAL_SERVER_ERROR,
            };
        }
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
