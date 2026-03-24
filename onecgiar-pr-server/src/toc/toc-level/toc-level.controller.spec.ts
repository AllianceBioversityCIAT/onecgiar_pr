import { TocLevelController } from './toc-level.controller';
import { TocLevelService } from './toc-level.service';

describe('TocLevelController', () => {
  let controller: TocLevelController;
  let service: jest.Mocked<TocLevelService>;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
    } as any;

    controller = new TocLevelController(service);
  });

  it('delegates findAll to TocLevelService', () => {
    const mockedResponse = [{ id: 1 }];
    service.findAll.mockReturnValue(mockedResponse as any);

    const result = controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toBe(mockedResponse);
  });
});
