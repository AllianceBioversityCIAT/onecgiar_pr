import { Injectable, signal, computed } from '@angular/core';

export type MdsStatus = 'empty' | 'partial' | 'complete';

export interface MdsFieldItem {
  key: string;
  label: string;
  filled: boolean;
  /** Optional subgroup label in the aside (e.g. "Theory of Change"). */
  group?: string;
}

export interface MdsSectionStatus {
  sectionName: string;
  sectionLabel: string;
  totalFields: number;
  filledFields: number;
  percentage: number;
  status: MdsStatus;
  fields: MdsFieldItem[];
}

const SECTION_ORDER = ['general-info', 'contributors', 'geography', 'evidence', 'type-specific'] as const;

const EMPTY_SECTIONS: Record<string, MdsFieldItem[]> = {
  'general-info': [],
  contributors: [],
  geography: [],
  evidence: [],
  'type-specific': [],
};

@Injectable()
export class BilateralMdsTrackerService {
  private readonly _fieldItems = signal<Record<string, MdsFieldItem[]>>({ ...EMPTY_SECTIONS });

  readonly sectionStatus = computed<MdsSectionStatus[]>(() => {
    const map = this._fieldItems();
    const keys = new Set([...SECTION_ORDER, ...Object.keys(map)]);
    return Array.from(keys).map(name => this.buildStatus(name, map[name] ?? []));
  });

  readonly overallPercentage = computed(() => {
    const statuses = this.sectionStatus();
    if (statuses.length === 0) return 0;
    const total = statuses.reduce((sum, s) => sum + s.totalFields, 0);
    const filled = statuses.reduce((sum, s) => sum + s.filledFields, 0);
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  });

  readonly overallStatus = computed<MdsStatus>(() => {
    const pct = this.overallPercentage();
    if (pct === 0) return 'empty';
    if (pct >= 100) return 'complete';
    return 'partial';
  });

  /** Replace all checklist items for a section (or only a group when `group` is set). */
  setSectionFields(sectionName: string, items: MdsFieldItem[], group?: string): void {
    this._fieldItems.update(map => {
      const normalized = items.map(item => (group ? { ...item, group } : item));
      if (!group) {
        return { ...map, [sectionName]: normalized };
      }
      const current = map[sectionName] ?? [];
      const kept = current.filter(i => i.group !== group);
      return { ...map, [sectionName]: [...kept, ...normalized] };
    });
  }

  getSectionFields(sectionName: string): MdsFieldItem[] {
    return this._fieldItems()[sectionName] ?? [];
  }

  /**
   * Legacy numeric update — synthesizes anonymous field slots.
   * Prefer `setSectionFields` for named checklist items.
   */
  setTotalFields(sectionName: string, total: number): void {
    const current = this._fieldItems()[sectionName] ?? [];
    const filled = current.filter(i => i.filled).length;
    this.synthesizeSlots(sectionName, total, Math.min(filled, total));
  }

  /**
   * Legacy numeric update — synthesizes anonymous field slots.
   * Prefer `setSectionFields` for named checklist items.
   */
  updateSection(sectionName: string, filledFields: number): void {
    const current = this._fieldItems()[sectionName] ?? [];
    const total = current.length > 0 ? current.length : Math.max(filledFields, 1);
    this.synthesizeSlots(sectionName, total, Math.min(filledFields, total));
  }

  reset(): void {
    this._fieldItems.set({ ...EMPTY_SECTIONS });
  }

  private synthesizeSlots(sectionName: string, total: number, filled: number): void {
    const items: MdsFieldItem[] = Array.from({ length: total }, (_, i) => ({
      key: `${sectionName}-${i}`,
      label: `Field ${i + 1}`,
      filled: i < filled,
    }));
    this._fieldItems.update(map => ({ ...map, [sectionName]: items }));
  }

  private buildStatus(name: string, fields: MdsFieldItem[]): MdsSectionStatus {
    const totalFields = fields.length;
    const filledFields = fields.filter(f => f.filled).length;
    const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    const status: MdsStatus = percentage === 0 ? 'empty' : percentage >= 100 ? 'complete' : 'partial';
    return {
      sectionName: name,
      sectionLabel: this.sectionLabel(name),
      totalFields,
      filledFields,
      percentage,
      status,
      fields,
    };
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
