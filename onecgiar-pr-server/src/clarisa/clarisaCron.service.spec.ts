import { ClarisaCronsService } from './clarisaCron.service';

describe('ClarisaCronsService', () => {
  let clarisaTaskService: {
    clarisaBootstrap: jest.Mock;
    tocDBBootstrap: jest.Mock;
    clarisaBootstrapImportantData: jest.Mock;
  };
  let service: ClarisaCronsService;

  beforeEach(() => {
    clarisaTaskService = {
      clarisaBootstrap: jest.fn(),
      tocDBBootstrap: jest.fn(),
      clarisaBootstrapImportantData: jest.fn(),
    };
    service = new ClarisaCronsService(clarisaTaskService as any);
  });

  it('should trigger full bootstrap and toc DB refresh on handleCron', () => {
    service.handleCron();

    expect(clarisaTaskService.clarisaBootstrap).toHaveBeenCalledTimes(1);
    expect(clarisaTaskService.tocDBBootstrap).toHaveBeenCalledTimes(1);
  });

  it('should trigger important data bootstrap on importantHandleCron', () => {
    service.importantHandleCron();

    expect(
      clarisaTaskService.clarisaBootstrapImportantData,
    ).toHaveBeenCalledTimes(1);
  });
});
