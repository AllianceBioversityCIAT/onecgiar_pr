import { Injectable, signal, computed } from '@angular/core';
import { ResultLevel, Resulttype, ResultBody } from '../../../../../shared/interfaces/result.interface';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultsListFilterService } from '../../results-outlet/pages/results-list/services/results-list-filter.service';

@Injectable({
  providedIn: 'root'
})
export class ResultLevelService {
  resultLevelList: ResultLevel[];
  resultLevelListSig = signal<ResultLevel[]>([]);
  outputOutcomeLevelsSig = computed(() => {
    const levels = this.resultLevelListSig();
    if (!levels || levels.length < 4) return [];
    return levels.slice(2, 4).reverse();
  });
  currentResultTypeList: Resulttype[];
  currentResultTypeListSig = signal<Resulttype[]>([]);
  resultBody = new ResultBody();
  currentResultLevelId = null;
  currentResultLevelIdSignal = signal<number | null>(null);
  currentResultLevelName = null;
  currentResultTypeId = null;
  resultHandle: string = '';
  private pendingResultTypeSelection: { id?: number; name?: string } | null = null;

  constructor(
    private api: ApiService,
    private resultsListFilterSE: ResultsListFilterService
  ) {
    this.GET_TypeByResultLevel();
  }

  onSelectResultLevel(resultLevel: ResultLevel) {
    const levelId = resultLevel.id;
    const originalLevel = this.resultLevelList?.find(level => level.id === levelId);
    const levelToUse = originalLevel || resultLevel;

    this.resultBody.result_level_id = levelToUse.id;
    this.resultBody['result_level_name'] = levelToUse.name;
    this.resultBody.result_type_id = null;
    this.currentResultTypeList = levelToUse.result_type;
    this.currentResultTypeListSig.set(levelToUse.result_type || []);

    (this.resultLevelList || []).forEach(reLevel => (reLevel.selected = false));
    if (originalLevel) {
      originalLevel.selected = true;
    }

    const updated = (this.resultLevelListSig() || []).map(rl => ({
      ...rl,
      selected: rl.id === levelId
    }));
    this.resultLevelListSig.set(updated);
  }

  cleanData() {
    this.resultBody = new ResultBody();
  }

  resetSelection() {
    const updated = (this.resultLevelListSig() || []).map(rl => ({
      ...rl,
      selected: false
    }));
    this.resultLevelListSig.set(updated);
    if (this.resultLevelList) {
      this.resultLevelList.forEach(reLevel => (reLevel.selected = false));
    }
  }

  preselectResultType(resultTypeId?: number, resultTypeName?: string) {
    if (!this.resultLevelList?.length) return;

    const matchesType = (type: Resulttype) => {
      if (resultTypeId != null) return type.id === resultTypeId;
      if (resultTypeName) return type.name?.trim().toLowerCase() === resultTypeName.trim().toLowerCase();
      return false;
    };

    let targetLevel = this.resultLevelList.find(level => level.result_type?.some(matchesType));
    if (!targetLevel) return;

    const visibleLevelIds = [3, 4];
    if (!visibleLevelIds.includes(targetLevel.id)) {
      const visibleLevel = this.resultLevelList.find(level => visibleLevelIds.includes(level.id) && level.result_type?.some(matchesType));
      if (visibleLevel) {
        targetLevel = visibleLevel;
      } else {
        const outcomeLevel = this.resultLevelList.find(level => level.id === 3);
        const outputLevel = this.resultLevelList.find(level => level.id === 4);
        if (outcomeLevel?.result_type?.some(matchesType)) {
          targetLevel = outcomeLevel;
        } else if (outputLevel?.result_type?.some(matchesType)) {
          targetLevel = outputLevel;
        }
      }
    }

    const targetLevelId = targetLevel.id;
    (this.resultLevelList || []).forEach(reLevel => {
      reLevel.selected = reLevel.id === targetLevelId;
    });

    const updated = this.resultLevelList.map(rl => ({
      ...rl,
      selected: rl.id === targetLevelId
    }));

    this.resultLevelListSig.set(updated);
    this.resultBody.result_level_id = targetLevel.id;
    this.resultBody['result_level_name'] = targetLevel.name;
    this.currentResultTypeList = targetLevel.result_type;
    this.currentResultTypeListSig.set(targetLevel.result_type || []);

    const targetType = targetLevel.result_type?.find(matchesType);
    this.resultBody.result_type_id = targetType?.id ?? null;
  }

  setPendingResultType(resultTypeId?: number, resultTypeName?: string) {
    this.pendingResultTypeSelection = {
      id: resultTypeId ?? undefined,
      name: resultTypeName ?? undefined
    };
  }

  consumePendingResultType(): { id?: number; name?: string } | null {
    const selection = this.pendingResultTypeSelection;
    this.pendingResultTypeSelection = null;
    return selection;
  }

  GET_TypeByResultLevel() {
    this.api.resultsSE.GET_TypeByResultLevel().subscribe(resp => {
      this.removeResultTypes(resp.response);
      this.resultLevelList = resp.response;
      this.resultLevelListSig.set(resp.response || []);

      this.resultsListFilterSE.setFiltersByResultLevelTypes(this.resultLevelList);
    });
  }

  removeResultTypes(list) {
    const resultlevel = list.find(item => item.id == 3);
    const removetType = (id: any) => {
      const index = resultlevel.result_type.findIndex(item => item.id == id);
      if (index >= 0) resultlevel.result_type.splice(index, 1);
    };
    removetType(10);
    removetType(11);
  }
}
