import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ClarisaCronsService {
    private readonly _logger:Logger = new Logger(ClarisaCronsService.name);

    @Cron(CronExpression.EVERY_8_HOURS)
    handleCron() {
        this._logger.debug(`clarisa's tasks are performed every 8 hours`);
      }
}
