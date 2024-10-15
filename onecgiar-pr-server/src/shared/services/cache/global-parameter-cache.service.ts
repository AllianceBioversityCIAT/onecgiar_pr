import { Injectable } from '@nestjs/common';
import { DataCache } from '../../../../src/shared/globalInterfaces/data-cache.interface';
import { GlobalParameterService } from '../../../api/global-parameter/global-parameter.service';
import { GlobalParameter } from '../../../../src/api/global-parameter/interfaces/global-parameter.interface';

@Injectable()
//TODO replace by nestjs cache module
export class GlobalParameterCacheService {
  constructor(private _globalParameterService: GlobalParameterService) {}
  private dataCache: DataCache = {};

  async getParam(key: string): Promise<any> {
    await this.loadAllGlobalParamatersByCategory(key);
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
      const data = await this._globalParameterService.findOneByName(key);
      const globalParameterItem: GlobalParameter = data?.response;

      const { response } = await this._globalParameterService.findByCategoryId(
        Number(globalParameterItem?.categoryId),
      );
      const globalParameterList: any = response;
      globalParameterList.forEach((globalParameter: GlobalParameter) => {
        this.dataCache[globalParameter.name] = globalParameter.value;
      });
    }
  }
}
