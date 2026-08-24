import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IndicatorDrawerComponent } from './indicator-drawer.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';

/**
 * Template replaced on purpose — these tests cover the drawer's rules (which id it queries with,
 * how it reads the answer, the unsaved-work guard), not its markup.
 */

describe('IndicatorDrawerComponent', () => {
  let fixture: ComponentFixture<IndicatorDrawerComponent>;
  let component: IndicatorDrawerComponent;
  let getExisting: jest.Mock;

  async function setup(indicator: Record<string, any>) {
    getExisting = jest.fn().mockReturnValue(of({ response: { contributors: [], resultTocResultId: 1, tocResultIndicatorId: 'IND-55' } }));

    await TestBed.configureTestingModule({
      imports: [IndicatorDrawerComponent],
      providers: [{ provide: ApiService, useValue: { resultsSE: { GET_ExistingResultsContributors: getExisting } } }]
    })
      .overrideComponent(IndicatorDrawerComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(IndicatorDrawerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('indicator', indicator);
    fixture.detectChanges();
  }

  describe('existing results', () => {
    it('queries with related_node_id — the column the server actually persists', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55', toc_result_indicator_id: 'SOMETHING-ELSE' });

      expect(getExisting).toHaveBeenCalledWith('toc-1', 'IND-55');
    });

    it('reads response.contributors — the endpoint answers an object, never an array', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      getExisting.mockReturnValue(
        of({ response: { contributors: [{ result_code: 'R-1', result_title: 'A result' }], resultTocResultId: 1, tocResultIndicatorId: 'IND-55' } })
      );
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.existing()).toEqual([{ result_code: 'R-1', result_title: 'A result' }]);
      expect(component.existing()!.length).toBe(1);
    });

    it('does not call the endpoint when the indicator carries no node id', async () => {
      await setup({ toc_result_id: 'toc-1' });

      expect(getExisting).not.toHaveBeenCalled();
      expect(component.existing()).toEqual([]);
    });

    it('falls back to an empty list when the endpoint errors — 404 is expected for a virgin indicator', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      getExisting.mockReturnValue(throwError(() => ({ status: 404 })));
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.existing()).toEqual([]);
      expect(component.loadingExisting()).toBe(false);
    });
  });

  describe('reporting permission', () => {
    it('defaults to false so a host that forgets to pass it cannot expose the action', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });

      expect(component.canReport()).toBe(false);
    });

    it('takes the value the host passes', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      fixture.componentRef.setInput('canReport', true);
      fixture.detectChanges();

      expect(component.canReport()).toBe(true);
    });
  });

  describe('unsaved-work guard', () => {
    it('asks before closing when the form has been touched', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      const closed = jest.fn();
      component.closed.subscribe(closed);

      component.onDirtyChange(true);
      component.requestClose();

      expect(component.confirmingExit()).toBe('close');
      expect(closed).not.toHaveBeenCalled();
    });

    it('closes straight away when nothing was typed', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      const closed = jest.fn();
      component.closed.subscribe(closed);

      component.requestClose();

      expect(closed).toHaveBeenCalled();
    });

    it('keeps what was typed when the user chooses to keep editing', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      const closed = jest.fn();
      component.closed.subscribe(closed);

      component.onDirtyChange(true);
      component.requestClose();
      component.cancelExit();

      expect(component.confirmingExit()).toBeNull();
      expect(closed).not.toHaveBeenCalled();
    });

    it('discards and closes when the user confirms', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      const closed = jest.fn();
      component.closed.subscribe(closed);

      component.onDirtyChange(true);
      component.requestClose();
      component.discardAndClose();

      expect(closed).toHaveBeenCalled();
      expect(component.formDirty()).toBe(false);
    });

    it('clears unsaved state when a different indicator is shown', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      component.onDirtyChange(true);

      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.formDirty()).toBe(false);
    });
  });
});
