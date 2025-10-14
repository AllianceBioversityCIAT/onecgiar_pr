import { Injectable } from '@nestjs/common';
import { CreateBilateralDto } from './dto/create-bilateral.dto';
import { ResultRepository } from '../results/result.repository';
import { VersioningService } from '../versioning/versioning.service';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { HandlersError } from '../../shared/handlers/error.utils';
import { Result, SourceEnum } from '../results/entities/result.entity';

@Injectable()
export class BilateralService {

    constructor(
        private readonly _resultRepository: ResultRepository,
        private readonly _handlersError: HandlersError,
        private readonly _versioningService: VersioningService,
    ) {}

    async create(bilateralDto: CreateBilateralDto, isAdmin?: boolean, versionId?: number,) {
        const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.REPORTING,
        );
        if (!version) {
            throw this._handlersError.returnErrorRes({
            error: version,
            debug: true,
            });
        }

        const last_code = await this._resultRepository.getLastResultCode();
        const newResultHeader: Result = await this._resultRepository.save({
            created_by: 0, // ------**@@&----- HABLAR CON JD PARA SABER QUE PONER AQUÍ
            version_id:
                isAdmin != undefined && Boolean(isAdmin) && versionId
                ? versionId
                : version.id,
            title: bilateralDto.title,
            result_code: last_code + 1,
            source: SourceEnum.Bilateral,
        });

        if (newResultHeader) {
            await this._resultRepository.update(newResultHeader.id, {
                description: bilateralDto.description,
            });
        }
    }
}
