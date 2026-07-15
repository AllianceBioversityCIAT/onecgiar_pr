import { Injectable, signal, computed } from '@angular/core';

export type MdsStatus = 'empty' | 'partial' | 'complete';

export interface MdsSectionStatus {
  sectionName: string;
  sectionLabel: string;
  totalFields: number;
  filledFields: number;
  percentage: number;
  status: MdsStatus;
}

const MDS_FIELD_DEFS: Record<string, { totalFields: number }> = {
  'general-info': { totalFields: 2 },
  contributors: { totalFields: 3 },
  geography: { totalFields: 1 },
  evidence: { totalFields: 1 },
};

@Injectable({ providedIn: 'root' })
export class BilateralMdsTrackerService {
  private _sections = signal<Record<string, number>>({
    'general-info': 0,
    contributors: 0,
    geography: 0,
    evidence: 0,
    'type-specific': 0,
  });

  private _totalOverrides = signal<Record<string, number>>({});

  private getTotal(sectionName: string): number {
    if (this._totalOverrides()[sectionName] !== undefined) {
      return this._totalOverrides()[sectionName];
    }
    return MDS_FIELD_DEFS[sectionName]?.totalFields ?? 0;
  }

  sectionStatus = computed<MdsSectionStatus[]>(() => {
    const fields = this._sections();
    const overrides = this._totalOverrides();
    const allKeys = new Set([...Object.keys(MDS_FIELD_DEFS), ...Object.keys(fields)]);
    return Array.from(allKeys).map((name) => {
      const filled = fields[name] ?? 0;
      const total = this.getTotal(name);
      const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
      const status: MdsStatus = percentage === 0 ? 'empty' : percentage >= 100 ? 'complete' : 'partial';
      return { sectionName: name, sectionLabel: this.sectionLabel(name), totalFields: total, filledFields: filled, percentage, status };
    });
  });

  overallPercentage = computed(() => {
    const statuses = this.sectionStatus();
    if (statuses.length === 0) return 0;
    const total = statuses.reduce((sum, s) => sum + s.totalFields, 0);
    const filled = statuses.reduce((sum, s) => sum + s.filledFields, 0);
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  });

  overallStatus = computed<MdsStatus>(() => {
    const pct = this.overallPercentage();
    if (pct === 0) return 'empty';
    if (pct >= 100) return 'complete';
    return 'partial';
  });

  setTotalFields(sectionName: string, total: number): void {
    this._totalOverrides.update(o => ({ ...o, [sectionName]: total }));
  }

  updateSection(sectionName: string, filledFields: number): void {
    const total = this.getTotal(sectionName);
    this._sections.update(s => ({ ...s, [sectionName]: Math.min(filledFields, total) }));
  }

  reset(): void {
    this._sections.set({ 'general-info': 0, contributors: 0, geography: 0, evidence: 0, 'type-specific': 0 });
    this._totalOverrides.set({});
  }

  private sectionLabel(name: string): string {
    const labels: Record<string, string> = {
      'general-info': 'General Information',
      contributors: 'Contributors & Partners',
      geography: 'Geographic Location',
      evidence: 'Evidence',
      'type-specific': 'Type-Specific',
    };
    return labels[name] ?? name;
  }
}
