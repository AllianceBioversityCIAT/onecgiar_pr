import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  private dataCache: any = {}; // This is where the information will be cached.

  getDataFromCache(key: string): any {
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

