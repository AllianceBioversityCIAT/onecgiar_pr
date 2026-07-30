import { InitiativeEntityMap } from './entities/initiative_entity_map.entity';
import {
  buildInitiativeEntityMapPayload,
  isP25PortfolioContext,
} from './initiative-entity-map.util';
import { P25_PORTFOLIO_ACRONYM } from '../../shared/constants/portfolio.constant';

describe('initiative-entity-map.util', () => {
  const entityMapRow = {
    id: 99,
    initiativeId: 10,
    entityId: 20,
    entity_obj: { name: 'Entity A' },
  } as InitiativeEntityMap;

  describe('isP25PortfolioContext', () => {
    it('returns true when acronym matches clarisa_portfolios P25', () => {
      expect(isP25PortfolioContext({ acronym: P25_PORTFOLIO_ACRONYM })).toBe(
        true,
      );
    });

    it('returns false for other portfolio acronyms', () => {
      expect(isP25PortfolioContext({ acronym: 'P22' })).toBe(false);
    });

    it('returns false when acronym is missing', () => {
      expect(isP25PortfolioContext({})).toBe(false);
    });
  });

  describe('buildInitiativeEntityMapPayload', () => {
    it('maps persisted rows when present', () => {
      expect(
        buildInitiativeEntityMapPayload(10, { acronym: 'P22' }, [entityMapRow]),
      ).toEqual([
        {
          id: 99,
          entityId: 20,
          initiativeId: 10,
          entityName: 'Entity A',
        },
      ]);
    });

    it('synthesizes self-mapping for P25 when table has no rows', () => {
      expect(
        buildInitiativeEntityMapPayload(
          55,
          {
            acronym: P25_PORTFOLIO_ACRONYM,
            entityName: 'Science Program X',
          },
          [],
        ),
      ).toEqual([
        {
          id: null,
          entityId: 55,
          initiativeId: 55,
          entityName: 'Science Program X',
        },
      ]);
    });

    it('returns empty array for non-P25 results without persisted rows', () => {
      expect(
        buildInitiativeEntityMapPayload(
          55,
          { acronym: 'P22', entityName: 'Initiative' },
          [],
        ),
      ).toEqual([]);
    });
  });
});
