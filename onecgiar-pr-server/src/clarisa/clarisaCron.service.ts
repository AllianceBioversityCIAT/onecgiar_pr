import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClarisaTaskService } from './clarisatask.service';

@Injectable()
export class ClarisaCronsService {
  private readonly _logger: Logger = new Logger(ClarisaCronsService.name);

  constructor(private readonly _clarisaTaskService: ClarisaTaskService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  handleCron() {
    this._clarisaTaskService.clarisaBootstrap();
  }
}
