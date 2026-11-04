// @akili-spec results/impact-results-reporting/sp-reporting-entry (IRE-T-3, IRE-R-5)
import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LabReportFormComponent } from '../lab-report-form/lab-report-form.component';
import { IndicatorDrawerComponent } from './indicator-drawer.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { ImpactArea, IMPACT_AREAS } from '../../../../shared/report-result/impact-areas.constant';

@Component({ selector: 'app-lab-report-form', standalone: true, template: '' })
class LabReportFormStub {
  readonly tocNode = input<any>(null);
  readonly indicator = input<any>(null);
  readonly emergingMode = input<boolean>(false);
  readonly emergingCategory = input<any>(null);
  readonly impactArea = input<ImpactArea | null>(null);
  readonly initiativeId = input<number>(0);
  readonly programCode = input<string>('');
  readonly columns = input<number>(1);
  readonly canReport = input<boolean>(false);
  readonly dirtyChange = output<boolean>();
  readonly loadingOverlayChange = output<string | null>();
  readonly cancelled = output<void>();
  readonly created = output<void>();
}

describe('IndicatorDrawerComponent — impact mode (IRE-T-3)', () => {
  let getExisting: jest.Mock;

  async function mount(impactArea: ImpactArea | null) {
    getExisting = jest.fn().mockReturnValue(of({ response: { contributors: [] } }));
    await TestBed.configureTestingModule({
      imports: [IndicatorDrawerComponent],
      providers: [
        { provide: ApiService, useValue: { resultsSE: { GET_ExistingResultsContributors: getExisting } } },
        { provide: PhasesService, useValue: { phases: { reporting: [] } } },
        provideRouter([])
      ]
    })
      .overrideComponent(IndicatorDrawerComponent, { remove: { imports: [LabReportFormComponent] }, add: { imports: [LabReportFormStub] } })
      .compileComponents();

    const fixture = TestBed.createComponent(IndicatorDrawerComponent);
    fixture.componentRef.setInput('indicator', null);
    fixture.componentRef.setInput('impactArea', impactArea);
    fixture.componentRef.setInput('initialTab', 'report');
    fixture.componentRef.setInput('canReport', true);
    fixture.detectChanges();
    return fixture;
  }

  it('header reads "Report impact result" and the area is forwarded to the form', async () => {
    const climate = IMPACT_AREAS[3];
    const fixture = await mount(climate);
    expect(fixture.nativeElement.querySelector('h3').textContent.trim()).toBe('Report impact result');
    expect(fixture.nativeElement.querySelector('aside').getAttribute('aria-label')).toBe('Report impact result');
    const form = fixture.debugElement.query(de => de.name === 'app-lab-report-form');
    expect(form.componentInstance.impactArea()).toEqual(climate);
  });

  it('shows no indicator context, "already reported" card or emerging blurb and fetches nothing', async () => {
    const fixture = await mount(IMPACT_AREAS[3]);
    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelector('header')).toBeNull();
    expect(text).not.toContain('No results reported against this indicator');
    expect(text).not.toContain('not planned in this program');
    expect(getExisting).not.toHaveBeenCalled();
  });

  it('without impactArea the drawer keeps its standard "Manage indicator" chrome (no regression)', async () => {
    const fixture = await mount(null);
    expect(fixture.nativeElement.querySelector('h3').textContent.trim()).toBe('Report result');
    expect(fixture.nativeElement.querySelector('aside').getAttribute('aria-label')).toBe('Manage indicator');
    expect(fixture.debugElement.query(de => de.name === 'app-lab-report-form').componentInstance.impactArea()).toBeNull();
  });
});
