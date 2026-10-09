// @akili-spec quality-assurance/qa-field-catalog
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClarisaApiKeyGuard } from '../bilateral/guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationService } from '../bilateral/services/clarisa-api-key-validation.service';
import { QaCatalogController } from './qa-catalog.controller';
import { QaCatalogService } from './qa-catalog.service';
import { QaCatalogSyncService } from './qa-catalog-sync.service';
import { QaCatalogField } from './entities/qa-catalog-field.entity';
import { QaCatalogResultType } from './entities/qa-catalog-result-type.entity';
import { QaCatalogSection } from './entities/qa-catalog-section.entity';
import { QaCatalogVersion } from './entities/qa-catalog-version.entity';

/**
 * DD-6: the guard and its validation service are providers of `BilateralModule` and are not
 * exported; they are re-provided here instead of importing that module (which would couple the
 * two and drag in its dependency graph).
 */
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      QaCatalogResultType,
      QaCatalogSection,
      QaCatalogField,
      QaCatalogVersion,
    ]),
  ],
  controllers: [QaCatalogController],
  providers: [
    QaCatalogService,
    QaCatalogSyncService,
    ClarisaApiKeyValidationService,
    ClarisaApiKeyGuard,
  ],
})
export class QaCatalogModule {}
