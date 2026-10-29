// @akili-spec quality-assurance/qa-field-catalog
import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClarisaApiKeyGuard } from '../bilateral/guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationService } from '../bilateral/services/clarisa-api-key-validation.service';
import { QaCatalogController } from './qa-catalog.controller';
import { QaCatalogModule } from './qa-catalog.module';
import { QaCatalogService } from './qa-catalog.service';
import { QaCatalogSyncService } from './qa-catalog-sync.service';
import { QaResultsRepository } from './qa-results.repository';
import { QaResultsService } from './qa-results.service';
import { QaCatalogField } from './entities/qa-catalog-field.entity';
import { QaCatalogResultType } from './entities/qa-catalog-result-type.entity';
import { QaCatalogSection } from './entities/qa-catalog-section.entity';
import { QaCatalogVersion } from './entities/qa-catalog-version.entity';
import { ModulesRoutes } from '../modules.routes';
import { AppModule } from '../../app.module';

const CATALOG_ENTITIES = [
  QaCatalogResultType,
  QaCatalogSection,
  QaCatalogField,
  QaCatalogVersion,
];

/** TypeOrmCoreModule (global) is not loaded in a unit test: a global stub stands in for the DataSource. */
@Global()
@Module({
  providers: [{ provide: DataSource, useValue: {} }],
  exports: [DataSource],
})
class StubDataSourceModule {}

/** No DataSource in a unit test: the four feature repositories are replaced by stubs. */
async function compileModule() {
  let builder = Test.createTestingModule({
    imports: [StubDataSourceModule, QaCatalogModule],
  });
  for (const entity of CATALOG_ENTITIES) {
    builder = builder.overrideProvider(getRepositoryToken(entity)).useValue({});
  }
  return builder.compile();
}

describe('QaCatalogModule wiring', () => {
  it('resolves the guard graph without BilateralModule (re-provided, DD-6)', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(QaCatalogController)).toBeInstanceOf(
      QaCatalogController,
    );
    expect(moduleRef.get(QaCatalogService)).toBeInstanceOf(QaCatalogService);
    expect(moduleRef.get(ClarisaApiKeyGuard)).toBeInstanceOf(
      ClarisaApiKeyGuard,
    );
    expect(moduleRef.get(ClarisaApiKeyValidationService)).toBeInstanceOf(
      ClarisaApiKeyValidationService,
    );
  });

  it('provides QaCatalogSyncService with the four catalog repositories (DD-10)', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(QaCatalogSyncService)).toBeInstanceOf(
      QaCatalogSyncService,
    );
    for (const entity of CATALOG_ENTITIES) {
      expect(moduleRef.get(getRepositoryToken(entity))).toBeDefined();
    }
  });

  it('provides QaResultsRepository on the injected DataSource (QRF-DD-1)', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(QaResultsRepository)).toBeInstanceOf(
      QaResultsRepository,
    );
  });

  it('provides QaResultsService with its catalog and repository dependencies (QRF-DD-1)', async () => {
    const moduleRef = await compileModule();
    expect(moduleRef.get(QaResultsService)).toBeInstanceOf(QaResultsService);
  });

  it('is imported by AppModule so the route is served', () => {
    expect(Reflect.getMetadata('imports', AppModule)).toContain(
      QaCatalogModule,
    );
  });

  it("is mounted at route 'qa' (=> /api/qa/catalog)", () => {
    expect(ModulesRoutes).toEqual(
      expect.arrayContaining([{ path: 'qa', module: QaCatalogModule }]),
    );
  });
});
