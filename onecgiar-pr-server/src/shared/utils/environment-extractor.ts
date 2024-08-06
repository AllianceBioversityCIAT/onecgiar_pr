import 'dotenv/config';
import { env } from 'process';
import { StringContentComparator } from './string-content-comparator';

export enum Environment {
  LOCAL = 'local',
  DEVELOPMENT = 'dev',
  PRODUCTION = 'prod',
}

export class EnvironmentExtractor {
  public static getCurrentEnvironment(): Environment {
    const currentEnv = env.ENVIRONMENT;
    const parsedEnv = Object.values(Environment).find(
      (e) => StringContentComparator.contentCompare(e, currentEnv) === 0,
    );

    return parsedEnv ?? Environment.DEVELOPMENT;
  }

  public static isLocal(): boolean {
    return this.getCurrentEnvironment() === Environment.LOCAL;
  }

  public static isDevelopment(): boolean {
    return this.getCurrentEnvironment() === Environment.DEVELOPMENT;
  }

  public static isProduction(): boolean {
    return this.getCurrentEnvironment() === Environment.PRODUCTION;
  }
}
