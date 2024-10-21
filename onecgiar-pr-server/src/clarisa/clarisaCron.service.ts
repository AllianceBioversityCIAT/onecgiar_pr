import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClarisaTaskService } from './clarisatask.service';
import { EnvironmentExtractor } from '../shared/utils/environment-extractor';

@Injectable()
export class ClarisaCronsService {
  private readonly _logger: Logger = new Logger(ClarisaCronsService.name);

  constructor(private readonly _clarisaTaskService: ClarisaTaskService) {}

  @Cron(CronExpression.EVERY_8_HOURS, {
    disabled: EnvironmentExtractor.isLocal(),
  })
  handleCron() {
    this._clarisaTaskService.clarisaBootstrap();
    this._clarisaTaskService.tocDBBootstrap();
  }

  @Cron(CronExpression.EVERY_HOUR, {
    disabled: EnvironmentExtractor.isLocal(),
  })
  importantHandleCron() {
    this._clarisaTaskService.clarisaBootstrapImportantData();
  }
}
