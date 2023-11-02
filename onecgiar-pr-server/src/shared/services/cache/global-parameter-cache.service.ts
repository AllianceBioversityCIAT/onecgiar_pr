import { Injectable } from '@nestjs/common';
import { DataCache } from '../../../../src/shared/globalInterfaces/data-cache.interface';
import { GlobalParameterService } from '../../../api/global-parameter/global-parameter.service';
import { GlobalParameter } from '../../../../src/api/global-parameter/interfaces/global-parameter.interface';

@Injectable()
export class GlobalParameterCacheService {
  constructor(private _globalParameterService: GlobalParameterService) {}
  private dataCache: DataCache = {}; // This is where the information will be cached.

  async getDataFromCache(key: string): Promise<any> {
    await this.loadAllGlobalParamatersByCategory(key);
    console.log(this.dataCache);
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

  async loadAllGlobalParamatersByCategory(key) {
    if (this.dataCache[key] === undefined) {
      const globalParameterItem: GlobalParameter =
        await this._globalParameterService.findOneByName(key);

      let globalParameterList: any =
        await this._globalParameterService.findByCategoryId(
          Number(globalParameterItem.categoryId),
        );

      globalParameterList.forEach((globalParameter: GlobalParameter) => {
        this.dataCache[globalParameter.name] = globalParameter.value;
      });
    }
  }
}

