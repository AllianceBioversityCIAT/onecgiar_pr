// @akili-spec quality-assurance/qa-field-catalog
import { Test } from '@nestjs/testing';
import { ClarisaApiKeyGuard } from '../bilateral/guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationService } from '../bilateral/services/clarisa-api-key-validation.service';
import { QaCatalogController } from './qa-catalog.controller';
import { QaCatalogModule } from './qa-catalog.module';
import { QaCatalogService } from './qa-catalog.service';
import { ModulesRoutes } from '../modules.routes';
import { AppModule } from '../../app.module';

describe('QaCatalogModule wiring', () => {
  it('resolves the guard graph without BilateralModule (re-provided, DD-6)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [QaCatalogModule],
    }).compile();
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
