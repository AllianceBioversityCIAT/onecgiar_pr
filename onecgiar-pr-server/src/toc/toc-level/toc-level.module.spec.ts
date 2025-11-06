import { Test } from '@nestjs/testing';
import { TocLevelModule } from './toc-level.module';
import { TocLevelService } from './toc-level.service';
import { TocLevelController } from './toc-level.controller';
import { TocLevelRepository } from './toc-level.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

describe('TocLevelModule', () => {
  async function compileModule() {
    return Test.createTestingModule({
      imports: [TocLevelModule],
    })
      .overrideProvider(TocLevelRepository)
      .useValue({})
      .overrideProvider(HandlersError)
      .useValue({})
      .compile();
  }

  it('provides TocLevelService', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(TocLevelService)).toBeDefined();
  });

  it('registers TocLevelController', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(TocLevelController)).toBeDefined();
  });

  it('exports TocLevelRepository', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(TocLevelRepository)).toBeDefined();
  });
});
