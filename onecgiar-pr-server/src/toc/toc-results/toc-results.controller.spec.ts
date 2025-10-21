import { TocResultsController } from './toc-results.controller';
import { TocResultsService } from './toc-results.service';

describe('TocResultsController', () => {
  let controller: TocResultsController;
  let service: jest.Mocked<TocResultsService>;

  beforeEach(() => {
    service = {
      findTocResultByConfig: jest.fn(),
      findAllByinitiativeId: jest.fn(),
      findFullInitiativeTocByResult: jest.fn(),
      findFullInitiativeTocByInitiative: jest.fn(),
      findTocResultByConfigV2: jest.fn(),
      findAllByinitiativeIdV2: jest.fn(),
    } as any;

    controller = new TocResultsController(service);
  });

  it('delegates findAll with numeric params', () => {
    controller.findAll('1', '2', '3');
    expect(service.findTocResultByConfig).toHaveBeenCalledWith(1, 2, 3);
  });

  it('delegates getTocResultByInitiativeAndLevels', () => {
    controller.getTocResultByInitiativeAndLevels(5, 2);
    expect(service.findAllByinitiativeId).toHaveBeenCalledWith(5, 2);
  });

  it('delegates getFullInitiativeTocByResult', () => {
    controller.getFullInitiativeTocByResult(10);
    expect(service.findFullInitiativeTocByResult).toHaveBeenCalledWith(10);
  });

  it('delegates getFullInitiativeTocByInitiative', () => {
    controller.getFullInitiativeTocByInitiative(11);
    expect(service.findFullInitiativeTocByInitiative).toHaveBeenCalledWith(11);
  });

  it('delegates findAllV2 with numeric params', () => {
    controller.findAllV2('4', '5', '6');
    expect(service.findTocResultByConfigV2).toHaveBeenCalledWith(4, 5, 6);
  });

  it('delegates getTocResultByInitiativeAndLevelsV2', () => {
    controller.getTocResultByInitiativeAndLevelsV2(8, 9);
    expect(service.findAllByinitiativeId).toHaveBeenCalledWith(8, 9);
  });
});
