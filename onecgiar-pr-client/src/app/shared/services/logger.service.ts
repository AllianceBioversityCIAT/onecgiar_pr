import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  OFF = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly level: LogLevel = environment.production ? LogLevel.ERROR : LogLevel.DEBUG;

  error(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.ERROR, message, optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.WARN, message, optionalParams);
  }

  info(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.INFO, message, optionalParams);
  }

  debug(message: string, ...optionalParams: any[]) {
    this.log(LogLevel.DEBUG, message, optionalParams);
  }

  private log(level: LogLevel, message: string, params: any[]) {
    if (level <= this.level) {
      switch (level) {
        case LogLevel.ERROR:
          break;
        case LogLevel.WARN:
          break;
        case LogLevel.INFO:
          break;
        case LogLevel.DEBUG:
          break;
      }
    }
  }
}
