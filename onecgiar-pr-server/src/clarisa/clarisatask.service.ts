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
import { TocResultsRepository } from '../toc/toc-results/toc-results.repository';

@Injectable()
export class ClarisaTaskService {
  private readonly _logger: Logger = new Logger(ClarisaTaskService.name);
  private clarisaConnection: ClarisaApiConnection;

  constructor(
    private readonly dataSource: DataSource,
    private readonly _httpService: HttpService,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly _tocResultsRepository: TocResultsRepository,
  ) {
    this.clarisaConnection = new ClarisaApiConnection(this._httpService);
  }

  private async syncControlList<Entity, Dto>(
    controlList: ClarisaEndpoints<Entity, Dto>,
    index: number,
  ): Promise<Entity[]> {
    this._logger.log(
      `>>>[${index}] Fetching data from CLARISA API for ${controlList.entity.name}`,
    );

    const data: Dto[] = await this.clarisaConnection
      .get<Dto[]>(controlList.path, { params: controlList.params })
      .catch((err) => {
        this._logger.error(
          `[${index}] Error fetching data from CLARISA API for ${controlList.entity.name} path: ${controlList.path}`,
        );
        this._logger.error(err);
        return [];
      });

    let transformedData: DeepPartial<Entity>[];
    if (controlList.mapper) {
      transformedData = controlList.mapper(data);
    } else {
      transformedData = data as unknown as Entity[];
    }

    return await this.dataSource
      .getRepository(controlList.entity)
      .save(transformedData)
      .then((data) => {
        this._logger.log(
          `[${index}] Data successfully saved for ${controlList.entity.name}!`,
        );
        return data;
      })
      .catch((err) => {
        this._logger.error(
          `[${index}] Error in data save for ${controlList.entity.name}!`,
        );
        this._logger.error(err);
        return null;
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

    return this.syncControlList(institutionsPartial, 1).then((data) => {
      this._logger.debug(
        `All CLARISA Institutions control list data has been created. Updated/created ${
          data.length ?? 0
        } institutions`,
      );
    });
  }

  async clarisaBootstrap() {
    this._logger.debug(`Cloning of CLARISA control lists`);

    const controlListsPromise: ((index: number) => Promise<unknown[]>)[] = [
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.UN_REGIONS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.COUNTRIES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.MELIA_STUDY_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.ACTION_AREAS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.CGIAR_ENTITY_TYPES, index);
      },
      async (index: number) => {
        return this.syncInitiatives(index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.IMPACT_AREAS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.GLOBAL_TARGETS, index);
      },
      async (index: number) => {
        return this.syncControlList(
          ClarisaEndpoints.IMPACT_AREA_INDICATORS,
          index,
        );
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.OUTCOME_INDICATORS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.REGION_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.INSTITUTION_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.POLICY_STAGES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.INNOVATION_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(
          ClarisaEndpoints.INNOVATION_READINESS_LEVELS,
          index,
        );
      },
      async (index: number) => {
        return this.syncControlList(
          ClarisaEndpoints.INNOVATION_CHARACTERISTICS,
          index,
        );
      },
      async (index: number) => {
        return this.syncControlList(
          ClarisaEndpoints.ACTION_AREA_OUTCOMES,
          index,
        );
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.GEOSCOPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.CGIAR_ENTITIES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.POLICY_TYPES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.SDGS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.SDG_TARGETS, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.TOC_PHASES, index);
      },
      async (index: number) => {
        return this.syncControlList(ClarisaEndpoints.SUBNATIONAL_SCOPES, index);
      },
    ];

    const results: PromiseSettledResult<unknown>[] = [];

    for (const [index, promise] of controlListsPromise.entries()) {
      try {
        const result = await promise(index + 1);
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
    }

    this._logger.debug('All CLARISA control lists have been created');

    return results;
  }

  async tocDBBootstrap() {
    this._logger.debug(`Cloning of ToC Results from ToC Integration DB`);

    return this.cloneResultTocRepository(1);
  }

  private async syncInitiatives(index: number) {
    const initiativesEndpoint = ClarisaEndpoints.INITIATIVES;
    this._logger.log(
      `>>>[${index}] Fetching data from CLARISA API for ${initiativesEndpoint.entity.name}`,
    );

    const data: ClarisaInitiativeDto[] = await this.clarisaConnection
      .get<ClarisaInitiativeDto[]>(initiativesEndpoint.path)
      .catch((err) => {
        this._logger.error(
          `[${index}] Error fetching data from CLARISA API for ${initiativesEndpoint.entity.name} path: ${initiativesEndpoint.path}`,
        );
        this._logger.error(err);
        return [];
      });

    const tocIds = await this._clarisaInitiativesRepository.getTocIdFromOst();

    const mappedInitiatives: DeepPartial<ClarisaInitiative>[] =
      this.initiativeMapper(data, tocIds);

    return await this.dataSource
      .getRepository(initiativesEndpoint.entity)
      .save(mappedInitiatives)
      .then((data) => {
        this._logger.log(
          `[${index}] Data saved for ${initiativesEndpoint.entity.name}`,
        );
        return data;
      });
  }

  private initiativeMapper(
    data: ClarisaInitiativeDto[],
    tocIds: OstTocIdDto[],
  ): DeepPartial<ClarisaInitiative>[] {
    return data.map((item) => {
      const tocData = tocIds.filter((toc) => toc.initiativeId == item.id);

      return {
        id: item.id,
        official_code: item.official_code,
        name: item.name,
        short_name: item.short_name,
        action_area_id: item.action_area_id,
        active: item.active,
        toc_id: tocData?.[0]?.toc_id || null,
        cgiar_entity_type_id: item.type_id,
      };
    });
  }

  private async cloneResultTocRepository(index: number) {
    return Promise.resolve(
      this._logger.log(
        `>>>[${index}] Refreshing data from ToC Integration DB for ToC Results`,
      ),
    )
      .then(() => this._tocResultsRepository.inactiveTocResult())
      .then(() => this._tocResultsRepository.getAllTocResultsFromOst())
      .then((data) => this._tocResultsRepository.save(data))
      .then(() =>
        this._logger.debug(
          `[${index}] All ToC Results have been refreshed from ToC Integration DB!`,
        ),
      )
      .catch((err) => {
        this._logger.error(
          `[${index}] Error in manipulating the data of ToC Results`,
        );
        this._logger.error(err);
      });
  }
}
