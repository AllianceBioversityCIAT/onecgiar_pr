import { InitiativeEntityMap } from './entities/initiative_entity_map.entity';
import { P25_PORTFOLIO_ACRONYM } from '../../shared/constants/portfolio.constant';

export type InitiativeEntityMapPayload = {
  id: number | null;
  entityId: number;
  initiativeId: number;
  entityName: string | null;
};

export type InitiativeEntityMapContext = {
  acronym?: string | null;
  entityName?: string | null;
};

export function isP25PortfolioContext(
  context: InitiativeEntityMapContext,
): boolean {
  return context.acronym === P25_PORTFOLIO_ACRONYM;
}

export function buildInitiativeEntityMapPayload(
  initiativeId: number,
  context: InitiativeEntityMapContext,
  entityMaps: InitiativeEntityMap[],
): InitiativeEntityMapPayload[] {
  if (entityMaps.length) {
    return entityMaps.map((entityMap) => ({
      id: entityMap.id,
      entityId: entityMap.entityId,
      initiativeId: entityMap.initiativeId,
      entityName: entityMap.entity_obj?.name ?? null,
    }));
  }

  if (isP25PortfolioContext(context) && Number.isFinite(initiativeId)) {
    return [
      {
        id: null,
        entityId: initiativeId,
        initiativeId,
        entityName: context.entityName ?? null,
      },
    ];
  }

  return [];
}
