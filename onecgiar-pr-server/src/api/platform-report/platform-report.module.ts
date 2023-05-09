import { Module } from '@nestjs/common';
import { PlatformReportService } from './platform-report.service';
import { PlatformReportController } from './platform-report.controller';
import Handlebars, { Exception } from 'handlebars';
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
      return new Handlebars.SafeString(`${options.fn(this) * 100}%`);
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
      'stringContentCompare',
      function (lvalue, rvalue, options) {
        if (arguments.length != 3) {
          throw new Exception(
            '#stringContentCompare requires exactly one two arguments',
          );
        }

        if (
          !(
            (typeof lvalue === 'string' || lvalue instanceof String) &&
            (typeof rvalue === 'string' || rvalue instanceof String)
          )
        ) {
          throw new Exception(
            '#stringContentCompare requires the two arguments provided being strings',
          );
        }

        /*
          now that we know they are strings, here we are forcing the String objects
          (note the capital "S") to be converted to strings (primitive type), 
          to correctly use the localeCompare function
        */
        lvalue = lvalue.toString();
        rvalue = rvalue.toString();

        if (lvalue.localeCompare(rvalue, 'en', { sensitivity: 'base' }) == 0) {
          return options.fn(this);
        } else {
          return options.inverse(this);
        }
      },
    );
  }
}
