import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InitiativeEntityMap } from './entities/initiative_entity_map.entity';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { InitiativeEntityMapRepository } from './initiative_entity_map.repository';

@Injectable()
export class InitiativeEntityMapService {
  private readonly _logger = new Logger(InitiativeEntityMapService.name);

  constructor(
    private readonly initiativeEntityMapRepository: InitiativeEntityMapRepository,
  ) {}

  /**
   * Save or update the mappings of an initiative to a list of entities.
   * Deletes the previous mappings and saves the new ones.
   */
  async linkInitiativeToEntities(
    initiativeId: number,
    entityIds: number[],
    user: TokenDto,
  ): Promise<InitiativeEntityMap[]> {
    this._logger.log(
      `Linking initiative ${initiativeId} to entities ${entityIds.join(', ')}`,
    );

    await this.initiativeEntityMapRepository.delete({ initiativeId });

    const newMappings = entityIds.map((entityId) => {
      const mapping = new InitiativeEntityMap();
      mapping.initiativeId = initiativeId;
      mapping.entityId = entityId;
      mapping.created_by = user.id;
      mapping.last_updated_by = user.id;
      return mapping;
    });

    this._logger.log(
      `Created new mappings for initiative ${initiativeId}: ${newMappings.map(
        (m) => `Entity ${m.entityId}`,
      )}`,
    );
    return this.initiativeEntityMapRepository.save(newMappings);
  }

  /**
   * Retrieve all mappings of initiatives to entities.
   * Returns an array of InitiativeEntityMap entities with their relations.
   */
  async getAllMappings() {
    const mappings = await this.initiativeEntityMapRepository.find({
      order: { id: 'ASC' },
    });

    const grouped = mappings.reduce(
      (acc, curr) => {
        if (!acc[curr.initiativeId]) {
          acc[curr.initiativeId] = [];
        }
        acc[curr.initiativeId].push(curr.entityId);
        return acc;
      },
      {} as Record<number, number[]>,
    );

    this._logger.log(
      `Retrieved ${Object.keys(grouped).length} initiative-entity mappings`,
    );
    const data = Object.entries(grouped).map(([initiativeId, entityIds]) => ({
      initiativeId: Number(initiativeId),
      entityIds,
    }));

    return {
      response: data,
      message: 'The initiative-entity mappings were retrieved successfully',
      status: HttpStatus.OK,
    };
  }
}
