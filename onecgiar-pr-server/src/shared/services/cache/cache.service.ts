import { Injectable } from '@nestjs/common';
import { DataCache } from '../../../../src/shared/globalInterfaces/data-cache.interface';
import { GlobalParameterService } from '../../../api/global-parameter/global-parameter.service';

@Injectable()
export class CacheService {
  constructor() {
    // private _globalParameterService: GlobalParameterService
  }
  private dataCache: DataCache = { test: 'Works' }; // This is where the information will be cached.

  getDataFromCache(key: string): any {
    // this._globalParameterService.findAll().then((data) => {
    //   console.log('Get data');
    //   console.log(data);
    //   this.dataCache[key] = data;
    //   console.log(this.dataCache);
    // });
    return this.dataCache[key];
  }

  setDataToCache(key: string, data: any): void {
    this.dataCache[key] = data;
  }

  clearCacheByKey(key: string): void {
    delete this.dataCache[key];
  }

  clearAllCache(): void {
    this.dataCache = {};
  }
}

