import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ClarisaTasksService {
    private readonly _logger:Logger = new Logger(ClarisaTasksService.name);

    @Cron(CronExpression.EVERY_8_HOURS)
    handleCron() {
        this._logger.debug(`clarisa's tasks are performed every 8 hours`);
      }
}
