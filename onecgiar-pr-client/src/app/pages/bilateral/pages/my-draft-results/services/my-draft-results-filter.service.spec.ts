import { TestBed } from '@angular/core/testing';
import { BilateralAiDraft } from '../../../services/bilateral-ai.interfaces';
import {
  MyDraftResultsFilterService,
  formatDraftProjectOption,
  matchesDraftCreatedBy,
  matchesDraftProject,
  matchesDraftSearch,
  normalizeProjectId,
} from './my-draft-results-filter.service';
import { MyDraftResultsFilterContext } from '../utils/draft-filter-helpers';

const emptyState = { selectedProjectIds: [] as string[], searchText: '', selectedCreatedBy: [] as string[] };

const draft = (id: number, projectId: unknown, extras: Partial<BilateralAiDraft> = {}): BilateralAiDraft =>
  ({
    id,
    job: { project_id: projectId, user_id: 10, ...((extras.job as object) ?? {}) },
    extracted_mds: { title: `Draft ${id}`, indicator: 'Innovation development' },
    ...extras,
  }) as unknown as BilateralAiDraft;

const context: MyDraftResultsFilterContext = {
  projectNameMap: { 7: 'PRJ-Seven — Rice Project' },
  resolvedUserNames: {},
  currentUserId: 42,
  currentUserName: 'Alice Reporter',
};

describe('MyDraftResultsFilterService (P2-3319 + BADF multiselect)', () => {
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
      expect(matchesDraftProject(draft(1, 7), emptyState)).toBe(true);
    });

    it('passes drafts matching any selected project (OR)', () => {
      expect(matchesDraftProject(draft(1, 7), { ...emptyState, selectedProjectIds: ['7'] })).toBe(true);
      expect(matchesDraftProject(draft(2, 9), { ...emptyState, selectedProjectIds: ['7'] })).toBe(false);
      expect(matchesDraftProject(draft(2, 9), { ...emptyState, selectedProjectIds: ['7', '9'] })).toBe(true);
    });

    it('rejects a draft with no job once a project is selected', () => {
      expect(
        matchesDraftProject({ id: 3 } as unknown as BilateralAiDraft, { ...emptyState, selectedProjectIds: ['7'] })
      ).toBe(false);
    });
  });

  describe('matchesDraftSearch (BADF-R-2)', () => {
    it('passes all drafts when search is empty', () => {
      expect(matchesDraftSearch(draft(1, 7), emptyState, context)).toBe(true);
    });

    it('matches title, indicator, project label, and creator display name', () => {
      const byTitle = draft(1, 7, { extracted_mds: { title: 'Kenya Risk Profile', indicator: 'Other' } });
      expect(matchesDraftSearch(byTitle, { ...emptyState, searchText: 'kenya' }, context)).toBe(true);

      const byIndicator = draft(2, 7, { extracted_mds: { title: 'X', indicator: 'Policy change' } });
      expect(matchesDraftSearch(byIndicator, { ...emptyState, searchText: 'policy' }, context)).toBe(true);

      expect(matchesDraftSearch(draft(3, 7), { ...emptyState, searchText: 'rice' }, context)).toBe(true);

      const meDraft = draft(4, 7, { job: { project_id: 7, user_id: 42 } });
      expect(matchesDraftSearch(meDraft, { ...emptyState, searchText: 'me' }, context)).toBe(true);
    });
  });

  describe('matchesDraftCreatedBy (BADF-R-3, BADF-R-6)', () => {
    it('passes all drafts when no creator is selected', () => {
      expect(matchesDraftCreatedBy(draft(1, 7), emptyState)).toBe(true);
    });

    it('matches selected creator ids with OR semantics', () => {
      const alice = draft(1, 7, { job: { project_id: 7, user_id: 5 } });
      const bob = draft(2, 7, { job: { project_id: 7, user_id: 8 } });
      expect(matchesDraftCreatedBy(alice, { ...emptyState, selectedCreatedBy: ['5'] })).toBe(true);
      expect(matchesDraftCreatedBy(bob, { ...emptyState, selectedCreatedBy: ['5'] })).toBe(false);
      expect(matchesDraftCreatedBy(bob, { ...emptyState, selectedCreatedBy: ['5', '8'] })).toBe(true);
    });
  });

  describe('state', () => {
    it('starts with no project selected', () => {
      expect(service.selectedProjectIds()).toEqual([]);
      expect(service.hasActiveFilters()).toBe(false);
    });

    it('selects projects via setProjects and reports the filter as active', () => {
      service.setProjects(['7']);
      expect(service.selectedProjectIds()).toEqual(['7']);
      expect(service.hasActiveFilters()).toBe(true);
      expect(service.state()).toEqual({ selectedProjectIds: ['7'], searchText: '', selectedCreatedBy: [] });
    });

    it('toggles projects on and off', () => {
      service.toggleProject('7');
      expect(service.selectedProjectIds()).toEqual(['7']);
      service.toggleProject('7');
      expect(service.selectedProjectIds()).toEqual([]);
      service.toggleProject('7');
      service.toggleProject('9');
      expect(service.selectedProjectIds()).toEqual(['7', '9']);
    });

    it('clearAll and clearProject both reset the dimension', () => {
      service.setProjects(['7']);
      service.clearProject();
      expect(service.hasActiveFilters()).toBe(false);

      service.setProjects(['7', '9']);
      service.clearAll();
      expect(service.selectedProjectIds()).toEqual([]);
      expect(service.hasActiveFilters()).toBe(false);
    });
  });

  describe('filterDrafts', () => {
    const drafts = [
      draft(1, 7, { job: { project_id: 7, user_id: 5 }, extracted_mds: { title: 'Alpha draft', indicator: 'Innovation' } }),
      draft(2, 9, { job: { project_id: 9, user_id: 8 }, extracted_mds: { title: 'Beta draft', indicator: 'Policy' } }),
      draft(3, '7', { job: { project_id: '7', user_id: 42 }, extracted_mds: { title: 'Gamma draft', indicator: 'Output' } }),
    ];

    it('returns the list untouched while nothing is selected', () => {
      expect(service.filterDrafts(drafts, context)).toBe(drafts);
    });

    it('keeps drafts from any selected project', () => {
      service.setProjects(['7']);
      expect(service.filterDrafts(drafts, context).map(d => d.id)).toEqual([1, 3]);
      service.setProjects(['7', '9']);
      expect(service.filterDrafts(drafts, context).map(d => d.id)).toEqual([1, 2, 3]);
    });

    it('AND-chains project with search and created by', () => {
      service.setProjects(['7']);
      service.setSearchText('alpha');
      service.setCreatedBy(['5']);
      expect(service.filterDrafts(drafts, context).map(d => d.id)).toEqual([1]);
    });

    it('returns everything again after clearing', () => {
      service.setProjects(['7']);
      service.setSearchText('alpha');
      service.setCreatedBy(['5']);
      service.clearAll();
      expect(service.filterDrafts(drafts, context).map(d => d.id)).toEqual([1, 2, 3]);
    });
  });

  describe('filterChipGroups (BADF-R-8)', () => {
    it('builds chips for search, creators, and each selected project', () => {
      service.setSearchText('rice');
      service.setCreatedBy(['42']);
      service.setProjects(['7', '9']);
      const chips = service.filterChipGroups(context, id => (id === '7' ? 'PRJ-Seven' : 'PRJ-Nine'), []);
      expect(chips.map(c => c.label)).toEqual([
        'Search: rice',
        'Created by: Me',
        'Project: PRJ-Seven',
        'Project: PRJ-Nine',
      ]);
    });

    it('clearChip removes one project without clearing others', () => {
      service.setProjects(['7', '9']);
      service.clearChip('project', '7');
      expect(service.selectedProjectIds()).toEqual(['9']);
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
    });
  });
});
