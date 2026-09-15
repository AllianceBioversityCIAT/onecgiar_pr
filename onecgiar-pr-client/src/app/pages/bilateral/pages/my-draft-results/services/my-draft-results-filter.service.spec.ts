import { TestBed } from '@angular/core/testing';
import { BilateralAiDraft } from '../../../services/bilateral-ai.interfaces';
import {
  MyDraftResultsFilterService,
  formatDraftProjectOption,
  matchesDraftProject,
  normalizeProjectId,
} from './my-draft-results-filter.service';

const draft = (id: number, projectId: unknown): BilateralAiDraft =>
  ({ id, job: { project_id: projectId } }) as unknown as BilateralAiDraft;

describe('MyDraftResultsFilterService (P2-3319)', () => {
  let service: MyDraftResultsFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MyDraftResultsFilterService] });
    service = TestBed.inject(MyDraftResultsFilterService);
  });

  describe('normalizeProjectId', () => {
    it('treats null, undefined and blanks as "no project"', () => {
      expect(normalizeProjectId(null)).toBe('');
      expect(normalizeProjectId(undefined)).toBe('');
      expect(normalizeProjectId('   ')).toBe('');
    });

    it('compares numeric and string ids as the same value', () => {
      expect(normalizeProjectId(7)).toBe('7');
      expect(normalizeProjectId(' 7 ')).toBe('7');
    });
  });

  describe('matchesDraftProject', () => {
    it('passes every draft when no project is selected', () => {
      expect(matchesDraftProject(draft(1, 7), { selectedProjectId: null })).toBe(true);
      expect(matchesDraftProject(draft(1, 7), { selectedProjectId: '' })).toBe(true);
    });

    it('passes only the drafts of the selected project', () => {
      expect(matchesDraftProject(draft(1, 7), { selectedProjectId: '7' })).toBe(true);
      expect(matchesDraftProject(draft(2, 9), { selectedProjectId: '7' })).toBe(false);
    });

    it('rejects a draft with no job once a project is selected', () => {
      expect(matchesDraftProject({ id: 3 } as unknown as BilateralAiDraft, { selectedProjectId: '7' })).toBe(false);
    });
  });

  describe('state', () => {
    it('starts with no project selected', () => {
      expect(service.selectedProjectId()).toBeNull();
      expect(service.hasActiveFilters()).toBe(false);
    });

    it('selects a project and reports the filter as active', () => {
      service.selectProject(7);
      expect(service.selectedProjectId()).toBe('7');
      expect(service.hasActiveFilters()).toBe(true);
      expect(service.state()).toEqual({ selectedProjectId: '7' });
    });

    it('clears on the shared select sentinel and on a re-pick of the active project', () => {
      service.selectProject('all');
      expect(service.selectedProjectId()).toBeNull();

      service.selectProject('7');
      service.selectProject('7');
      expect(service.selectedProjectId()).toBeNull();
    });

    it('clearAll and clearProject both reset the dimension', () => {
      service.selectProject('7');
      service.clearProject();
      expect(service.hasActiveFilters()).toBe(false);

      service.selectProject('7');
      service.clearAll();
      expect(service.selectedProjectId()).toBeNull();
      expect(service.hasActiveFilters()).toBe(false);
    });
  });

  describe('filterDrafts', () => {
    const drafts = [draft(1, 7), draft(2, 9), draft(3, '7')];

    it('returns the list untouched while nothing is selected', () => {
      expect(service.filterDrafts(drafts)).toBe(drafts);
    });

    it('keeps only the selected project, matching string and numeric ids alike', () => {
      service.selectProject('7');
      expect(service.filterDrafts(drafts).map(d => d.id)).toEqual([1, 3]);
    });

    it('returns everything again after clearing', () => {
      service.selectProject('7');
      service.clearAll();
      expect(service.filterDrafts(drafts).map(d => d.id)).toEqual([1, 2, 3]);
    });

    it('survives a null list', () => {
      expect(service.filterDrafts(null as unknown as BilateralAiDraft[])).toEqual([]);
      service.selectProject('7');
      expect(service.filterDrafts(null as unknown as BilateralAiDraft[])).toEqual([]);
    });
  });

  describe('formatDraftProjectOption (BADR-R-1, BADR-AC-1, BADR-AC-2, Defect Gate D1)', () => {
    it('formats label as "<shortName> — <fullName>" and extracts code and title when mapped', () => {
      const nameMap = {
        10156: 'A-AG10156 — Climate Rice Advisory',
      };
      const opt = formatDraftProjectOption('10156', nameMap);
      expect(opt).toEqual({
        value: '10156',
        label: 'A-AG10156 — Climate Rice Advisory',
        code: 'A-AG10156',
        title: 'Climate Rice Advisory',
      });
    });

    it('falls back to raw project ID when unmapped in nameMap (BADR-AC-2)', () => {
      const opt = formatDraftProjectOption('A-AG99999', {});
      expect(opt).toEqual({
        value: 'A-AG99999',
        label: 'A-AG99999',
      });
      expect(opt.label).toBe('A-AG99999');
    });

    it('handles shortName without fullName cleanly', () => {
      const nameMap = {
        7: 'PRJ-Seven',
      };
      const opt = formatDraftProjectOption(7, nameMap);
      expect(opt).toEqual({
        value: '7',
        label: 'PRJ-Seven',
      });
    });
  });
});
