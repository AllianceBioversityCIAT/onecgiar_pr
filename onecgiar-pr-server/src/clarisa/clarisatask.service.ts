import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DataSource, DeepPartial } from 'typeorm';
import { ClarisaApiConnection } from './clarisa.connection';
import { ClarisaEndpoints } from './clarisa-endpoints.enum';
import { ClarisaInitiativesRepository } from './clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaInitiativeDto } from './dtos/clarisa-initiative.dto';
import { ClarisaInitiative } from './clarisa-initiatives/entities/clarisa-initiative.entity';
import { OstTocIdDto } from './clarisa-initiatives/dto/ost-toc-id.dto';
import { ClarisaInstitutionsRepository } from './clarisa-institutions/ClariasaInstitutions.repository';

@Injectable()
export class ClarisaTaskService {
  private readonly _logger: Logger = new Logger(ClarisaTaskService.name);
  private clarisaConnection: ClarisaApiConnection;

  constructor(
    private readonly dataSource: DataSource,
    private readonly _httpService: HttpService,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
  ) {
    this.clarisaConnection = new ClarisaApiConnection(this._httpService);
  }

  private async syncControlList<Entity, Dto>(
    controlList: ClarisaEndpoints<Entity, Dto>,
  ): Promise<Entity[]> {
    this._logger.log(
      `Fetching data from CLARISA API for ${controlList.entity.name}`,
    );

    const data: Dto[] = await this.clarisaConnection
      .get<Dto[]>(controlList.path, { params: controlList.params })
      .catch((err) => {
        this._logger.error(
          `Error fetching data from CLARISA API for ${controlList.entity.name} path: ${controlList.path}`,
        );
        this._logger.error(err);
        return [];
      });

    let transformedData: DeepPartial<Entity>[];
    if (controlList.mapper) {
      transformedData = data.map((item) => controlList.mapper(item));
    } else {
      transformedData = data as unknown as Entity[];
    }

    return await this.dataSource
      .getRepository(controlList.entity)
      .save(transformedData)
      .then((data) => {
        this._logger.log(`Data saved for ${controlList.entity.name}`);
        return data;
      });
  }

  public async clarisaBootstrapImportantData() {
    this._logger.debug(`Cloning of CLARISA important control lists`);
    const lastUpdated = (
      await this._clarisaInstitutionsRepository.getMostRecentLastUpdated()
    )[0]?.most_recent;
    const institutionsPartial = ClarisaEndpoints.INSTITUTIONS_FULL;
    if (lastUpdated) {
      institutionsPartial.params = {
        ...institutionsPartial.params,
        from: lastUpdated,
      };
    }

    return this.syncControlList(institutionsPartial).then((data) => {
      this._logger.verbose(
        `All CLARISA Institutions control list data has been created. Updated/created ${
          data.length ?? 0
        } institutions`,
      );
    });
  }

  async clarisaBootstrap() {
    this._logger.debug(`Cloning of CLARISA control lists`);

    return this.syncInitiatives();
  }

  private async syncInitiatives() {
    const initiativesEndpoint = ClarisaEndpoints.INITIATIVES;
    this._logger.log(
      `Fetching data from CLARISA API for ${initiativesEndpoint.entity.name}`,
    );

    const data: ClarisaInitiativeDto[] = await this.clarisaConnection
      .get<ClarisaInitiativeDto[]>(initiativesEndpoint.path)
      .catch((err) => {
        this._logger.error(
          `Error fetching data from CLARISA API for ${initiativesEndpoint.entity.name} path: ${initiativesEndpoint.path}`,
        );
        this._logger.error(err);
        return [];
      });

    const tocIds = await this._clarisaInitiativesRepository.getTocIdFromOst();

    const mappedInitiatives: DeepPartial<ClarisaInitiative>[] = data.map(
      (item) => this.initiativeMapper(item, tocIds),
    );

    return await this.dataSource
      .getRepository(initiativesEndpoint.entity)
      .save(mappedInitiatives)
      .then((data) => {
        this._logger.log(`Data saved for ${initiativesEndpoint.entity.name}`);
        return data;
      });
  }

  private initiativeMapper(
    data: ClarisaInitiativeDto,
    tocIds: OstTocIdDto[],
  ): DeepPartial<ClarisaInitiative> {
    const tocData = tocIds.filter((toc) => toc.initiativeId == data.id);
    return {
      id: data.id,
      official_code: data.official_code,
      name: data.name,
      short_name: data.short_name,
      action_area_id: data.action_area_id,
      active: data.active,
      toc_id: tocData?.[0]?.toc_id || null,
      cgiar_entity_type_id: data.type_id,
    };
  }
}
