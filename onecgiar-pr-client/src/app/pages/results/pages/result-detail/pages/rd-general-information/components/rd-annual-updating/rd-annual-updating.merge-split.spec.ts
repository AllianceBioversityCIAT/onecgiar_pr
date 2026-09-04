import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { RdAnnualUpdatingComponent } from './rd-annual-updating.component';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

/**
 * P2-3292 Steps 3A / 3B — the "where did this innovation continue" dropdowns.
 *
 * What these pin, in order of what would hurt most:
 *   1. The two dropdowns share ONE stored collection, told apart by `transition_type`. Rebuilding
 *      the array from one of them wipes the other's answers, and a reporter who declared both a
 *      merge and a split would lose whichever they filled first — silently.
 *   2. The reasons are recognised by TEXT. If a catalogue row is ever reworded the dropdown just
 *      stops appearing, with no error, so the strings are asserted verbatim here.
 *   3. A declared merge with no target is the exact state this story exists to prevent, so it must
 *      report incomplete.
 */
const INNOVATION_DEVELOPMENT = 7;
const MERGE_REASON = 'Discontinued: merging with another innovation';
const SPLIT_REASON = 'Discontinued: splitting into multiple innovations';

describe('RdAnnualUpdatingComponent — merge / split targets (P2-3292 Step 3)', () => {
  let dataControlSE: DataControlService;
  let api: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdAnnualUpdatingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    dataControlSE = TestBed.inject(DataControlService);
    api = TestBed.inject(ApiService);
  });

  /** A component with the 2026 Innovation Development context the story scopes. */
  const build = (options: any[] = [], discontinued = true) => {
    dataControlSE.currentResult = { id: 11494, result_type_id: INNOVATION_DEVELOPMENT, phase_year: 2026 };
    dataControlSE.reportingCurrentPhase = { ...dataControlSE.reportingCurrentPhase, phaseYear: 2026 };

    const component = TestBed.createComponent(RdAnnualUpdatingComponent).componentInstance;
    component.generalInfoBody.is_discontinued = discontinued;
    component.generalInfoBody.discontinued_options = options;
    component.generalInfoBody.merge_split_targets = [];
    return component;
  };

  const ticked = (text: string) => ({ option: text, value: true });
  const unticked = (text: string) => ({ option: text, value: false });

  describe('when the dropdowns appear', () => {
    it('shows the merge dropdown only when the merging reason is ticked', () => {
      expect(build([ticked(MERGE_REASON)]).showsMergeTargets).toBe(true);
      expect(build([unticked(MERGE_REASON)]).showsMergeTargets).toBe(false);
      expect(build([]).showsMergeTargets).toBe(false);
    });

    it('shows the split dropdown only when the splitting reason is ticked', () => {
      expect(build([ticked(SPLIT_REASON)]).showsSplitTargets).toBe(true);
      expect(build([ticked(MERGE_REASON)]).showsSplitTargets).toBe(false);
    });

    it('shows both when the reporter ticked both reasons', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      expect(component.showsMergeTargets).toBe(true);
      expect(component.showsSplitTargets).toBe(true);
    });

    it('hides them when the innovation is not discontinued at all', () => {
      // The reason cannot be ticked without the innovation being inactive, but the flag is the
      // authority: unticking "inactive" must take the whole block away with it.
      const component = build([ticked(MERGE_REASON)], false);
      expect(component.showsMergeTargets).toBe(false);
    });

    it('does not match a different reason that merely mentions innovations', () => {
      const component = build([ticked('Discontinued: limited W1/W2 resource availability')]);
      expect(component.showsMergeTargets).toBe(false);
      expect(component.showsSplitTargets).toBe(false);
    });

    it('tolerates padded catalogue text', () => {
      expect(build([{ option: `  ${MERGE_REASON}  `, value: true }]).showsMergeTargets).toBe(true);
    });
  });

  describe('the two dropdowns share one collection without erasing each other', () => {
    it('keeps the split targets when the merge selection changes', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);

      component.onTargetsChange('split', [701, 702]);
      component.onTargetsChange('merge', [900]);

      expect(component.selectedTargets('split')).toEqual([701, 702]);
      expect(component.selectedTargets('merge')).toEqual([900]);
      expect(component.generalInfoBody.merge_split_targets).toHaveLength(3);
    });

    it('replaces only its own type when a selection is reduced', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      component.onTargetsChange('merge', [900, 901]);
      component.onTargetsChange('split', [701]);

      component.onTargetsChange('merge', [901]);

      expect(component.selectedTargets('merge')).toEqual([901]);
      expect(component.selectedTargets('split')).toEqual([701]);
    });

    it('clears its own type when the selection is emptied, leaving the other', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      component.onTargetsChange('merge', [900]);
      component.onTargetsChange('split', [701]);

      component.onTargetsChange('merge', []);

      expect(component.selectedTargets('merge')).toEqual([]);
      expect(component.selectedTargets('split')).toEqual([701]);
    });

    it('stores every entry with its transition type, which is how the server tells them apart', () => {
      const component = build([ticked(SPLIT_REASON)]);

      component.onTargetsChange('split', [701, 702, 703]);

      expect(component.generalInfoBody.merge_split_targets).toEqual([
        { target_result_id: 701, transition_type: 'split' },
        { target_result_id: 702, transition_type: 'split' },
        { target_result_id: 703, transition_type: 'split' }
      ]);
    });

    it('survives a null selection without throwing', () => {
      const component = build([ticked(MERGE_REASON)]);
      expect(() => component.onTargetsChange('merge', null as any)).not.toThrow();
      expect(component.selectedTargets('merge')).toEqual([]);
    });
  });

  describe('completeness', () => {
    it('is incomplete while a declared merge names no target', () => {
      expect(build([ticked(MERGE_REASON)]).mergeSplitIsComplete).toBe(false);
    });

    it('becomes complete once a target is named', () => {
      const component = build([ticked(MERGE_REASON)]);
      component.onTargetsChange('merge', [900]);
      expect(component.mergeSplitIsComplete).toBe(true);
    });

    it('requires a target for EACH declared transition, not just one of them', () => {
      const component = build([ticked(MERGE_REASON), ticked(SPLIT_REASON)]);
      component.onTargetsChange('merge', [900]);
      expect(component.mergeSplitIsComplete).toBe(false);

      component.onTargetsChange('split', [701]);
      expect(component.mergeSplitIsComplete).toBe(true);
    });

    it('is complete when neither reason is declared', () => {
      expect(build([]).mergeSplitIsComplete).toBe(true);
    });
  });

  describe('the catalogue', () => {
    it('labels each option as the story asks: innovation id then title', () => {
      const spy = jest
        .spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations')
        .mockReturnValue(of({ response: [{ result_code: 6432, title: 'Drought-tolerant bean' }] }) as any);

      const component = build([ticked(MERGE_REASON)]);
      component.ensureMergeSplitCatalogue();

      expect(spy).toHaveBeenCalledWith(11494);
      expect(component.mergeSplitCatalogue[0].label).toBe('6432 - Drought-tolerant bean');
    });

    it('is requested once, not on every click', () => {
      const spy = jest.spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations').mockReturnValue(of({ response: [] }) as any);

      const component = build([ticked(MERGE_REASON)]);
      component.ensureMergeSplitCatalogue();
      component.ensureMergeSplitCatalogue();
      component.ensureMergeSplitCatalogue();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('is not fetched at all while neither dropdown is visible', () => {
      const spy = jest.spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations');

      build([]).ensureMergeSplitCatalogue();

      expect(spy).not.toHaveBeenCalled();
    });

    it('leaves an empty list and stops loading when the request fails', () => {
      // General Information is a whole screen of unrelated fields; an unreadable catalogue must not
      // cost the reporter any of them.
      jest.spyOn(api.resultsSE, 'GET_mergeSplitTargetInnovations').mockReturnValue(throwError(() => new Error('boom')) as any);

      const component = build([ticked(MERGE_REASON)]);
      expect(() => component.ensureMergeSplitCatalogue()).not.toThrow();
      expect(component.mergeSplitCatalogue).toEqual([]);
      expect(component.mergeSplitCatalogueLoading).toBe(false);
    });
  });
});
