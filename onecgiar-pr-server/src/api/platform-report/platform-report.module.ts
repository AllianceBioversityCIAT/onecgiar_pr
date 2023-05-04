import { Module } from '@nestjs/common';
import { PlatformReportService } from './platform-report.service';
import { PlatformReportController } from './platform-report.controller';
import Handlebars from 'handlebars';
import { HandlersError } from '../../shared/handlers/error.utils';
import { PlatformReportRepository } from './platform-report.repository';

@Module({
  controllers: [PlatformReportController],
  providers: [PlatformReportService, HandlersError, PlatformReportRepository],
})
export class PlatformReportModule {
  public constructor() {
    Handlebars.registerHelper('safeEmpty', function (options) {
      const value: string = options.fn(this);
      if (value == null) {
        return new Handlebars.SafeString('Not Defined');
      } else if (value == '') {
        return new Handlebars.SafeString('Not Provided');
      } else {
        return value;
      }
    });

    Handlebars.registerHelper('percentage', function (options) {
      return new Handlebars.SafeString(`${options.fn(this) * 100}`);
    });

    //taken from https://stackoverflow.com/a/30122739
    Handlebars.registerHelper(
      'mathOperator',
      function (lvalue, operator, rvalue, options) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);

        return {
          '+': lvalue + rvalue,
          '-': lvalue - rvalue,
          '*': lvalue * rvalue,
          '/': lvalue / rvalue,
        }[operator];
      },
    );

    Handlebars.registerHelper(
      'operator',
      function (lvalue, operator, rvalue, options) {
        return {
          '==': lvalue == rvalue ? options.fn(this) : options.inverse(this),
          '===': lvalue === rvalue ? options.fn(this) : options.inverse(this),
          '!=': lvalue != rvalue ? options.fn(this) : options.inverse(this),
          '!==': lvalue !== rvalue ? options.fn(this) : options.inverse(this),
          '<': lvalue < rvalue ? options.fn(this) : options.inverse(this),
          '<=': lvalue <= rvalue ? options.fn(this) : options.inverse(this),
          '>': lvalue > rvalue ? options.fn(this) : options.inverse(this),
          '>=': lvalue >= rvalue ? options.fn(this) : options.inverse(this),
          '&&': lvalue && rvalue ? options.fn(this) : options.inverse(this),
          '||': lvalue || rvalue ? options.fn(this) : options.inverse(this),
        }[operator];
      },
    );
  }
}
