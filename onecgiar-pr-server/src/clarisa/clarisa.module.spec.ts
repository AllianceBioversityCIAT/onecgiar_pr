import 'reflect-metadata';
import { ClarisaModule } from './clarisa.module';
import { ClarisaGlobalUnitModule } from './clarisa-global-unit/clarisa-global-unit.module';
import { ClarisaTaskService } from './clarisatask.service';
import { ClarisaCronsService } from './clarisaCron.service';
import { TocResultsRepository } from '../toc/toc-results/toc-results.repository';

describe('ClarisaModule metadata', () => {
  it('should include ClarisaGlobalUnitModule in imports', () => {
    const imports = Reflect.getMetadata('imports', ClarisaModule) as unknown[];
    expect(imports).toEqual(expect.arrayContaining([ClarisaGlobalUnitModule]));
  });

  it('should provide task and cron services', () => {
    const providers = Reflect.getMetadata(
      'providers',
      ClarisaModule,
    ) as unknown[];
    expect(providers).toEqual(
      expect.arrayContaining([
        ClarisaTaskService,
        ClarisaCronsService,
        TocResultsRepository,
      ]),
    );
  });

  it('should export ClarisaTaskService', () => {
    const exportsMetadata = Reflect.getMetadata(
      'exports',
      ClarisaModule,
    ) as unknown[];
    expect(exportsMetadata).toEqual(
      expect.arrayContaining([ClarisaTaskService]),
    );
  });
});
