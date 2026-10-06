// @akili-spec quality-assurance/qa-field-catalog
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ClarisaApiKeyGuard } from '../bilateral/guards/clarisa-api-key.guard';
import { ClarisaApiKeyValidationService } from '../bilateral/services/clarisa-api-key-validation.service';
import { QaCatalogController } from './qa-catalog.controller';
import { QaCatalogService } from './qa-catalog.service';

/**
 * DD-6: the guard and its validation service are providers of `BilateralModule` and are not
 * exported; they are re-provided here instead of importing that module (which would couple the
 * two and drag in its dependency graph).
 */
@Module({
  imports: [HttpModule],
  controllers: [QaCatalogController],
  providers: [
    QaCatalogService,
    ClarisaApiKeyValidationService,
    ClarisaApiKeyGuard,
  ],
})
export class QaCatalogModule {}
