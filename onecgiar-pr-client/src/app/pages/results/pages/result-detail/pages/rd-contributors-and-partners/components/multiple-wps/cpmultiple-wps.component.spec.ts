import { Component, Input, provideZonelessChangeDetection, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CPMultipleWPsComponent } from './multiple-wps.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { CustomizedAlertsFeService } from '../../../../../../../../shared/services/customized-alerts-fe.service';
import { FieldsManagerService } from '../../../../../../../../shared/services/fields-manager.service';
import { RdContributorsAndPartnersService } from '../../rd-contributors-and-partners.service';

@Component({
  selector: 'app-multiple-wps-content',
  template: `<div data-testid="wps-content" *ngIf="showMultipleWPsContent">Level / HLO / KPI form</div>`,
  standalone: false
})
class StubMultipleWPsContentComponent {
  @Input() editable: boolean;
  @Input() activeTab: any;
  @Input() activeTabSignal: any;
  @Input() resultLevelId: number | string;
  @Input() isIpsr: boolean;
  @Input() showMultipleWPsContent: boolean = true;
  @Input() isUnplanned: boolean;
  @Input() hidden: boolean;
  @Input() isAvisa: boolean;
  @Input() outcomeList: any;
  @Input() eoiList: any;
  @Input() outputList: any;
  @Input() allTabsCreated: any;
  @Input() selectedOptionsOutput: any;
  @Input() selectedOptionsOutcome: any;
  @Input() selectedOptionsEOI: any;
}

describe('CPMultipleWPsComponent', () => {
  let component: CPMultipleWPsComponent;
  let fixture: ComponentFixture<CPMultipleWPsComponent>;

  const contentEl = () => fixture.nativeElement.querySelector('[data-testid="wps-content"]');

  beforeEach(async () => {
    const currentResultSignal = signal({ id: 100, result_id: 100, result_level_id: 2 });
    const apiMock = {
      dataControlSE: {
        currentNotification: null,
        currentResult: { id: 100 },
        get currentResultSignal() {
          return currentResultSignal;
        },
        set currentResultSignal(val: any) {
          if (typeof val === 'function') {
            currentResultSignal.set(val());
          } else {
            currentResultSignal.set(val);
          }
        },
        // SBT-T-2 (P2-3542): `ngOnInit`/`ngOnDestroy` now call these unconditionally. Not exercised
        // by this describe's tests — see the dedicated "off-screen ToC gap source" describe below —
        // but required so `ngOnInit` does not throw a TypeError on the plain `fixture.detectChanges()`
        // every test here already does.
        registerOffscreenFeedback: jest.fn(),
        unregisterOffscreenFeedback: jest.fn()
      },
      tocApiSE: {
        GET_tocLevelsByconfig: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    await TestBed.configureTestingModule({
      declarations: [CPMultipleWPsComponent, StubMultipleWPsContentComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => false, isP25: () => false } },
        { provide: RdContributorsAndPartnersService, useValue: { savedActiveTabIndex: null, partnersBody: {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CPMultipleWPsComponent);
    component = fixture.componentInstance;
    component.editable = true;
    component.resultLevelId = 2;
    component.initiativeId = 5;
    component.initiative = {
      official_code: 'INIT-01',
      short_name: 'INIT',
      planned_result: true,
      result_toc_results: [{ uniqueId: '0' }, { uniqueId: '1' }]
    };
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // P2-3245 / P2-3275: under zoneless change detection the `false -> setTimeout -> true` toggle
  // used to leave the view frozen on `false`, so the Level/HLO/KPI form never came back after
  // pressing "Add other TOC result" (empty container reported by both tickets).
  it('renders the Level/HLO/KPI form again after "Add other TOC result"', async () => {
    fixture.nativeElement.querySelector('.tab-add-button').click();
    await fixture.whenStable();

    // The toggle hides the content synchronously before re-showing it.
    expect(contentEl()).toBeFalsy();

    await new Promise(resolve => setTimeout(resolve, 100));
    await fixture.whenStable();

    expect(component.showMultipleWPsContent).toBe(true);
    expect(contentEl()).toBeTruthy();
  });

  it('restores the content when switching between tabs', async () => {
    fixture.nativeElement.querySelectorAll('.tab-content')[1].click();
    await fixture.whenStable();

    expect(contentEl()).toBeFalsy();

    await new Promise(resolve => setTimeout(resolve, 100));
    await fixture.whenStable();

    expect(component.activeTabIndex).toBe(1);
    expect(contentEl()).toBeTruthy();
  });

  describe('dynamicTabTitle', () => {
    it('renders "Outcome N~X" when currentResult is an Outcome (result_level_id: 3)', () => {
      const apiMock = TestBed.inject(ApiService);
      apiMock.dataControlSE.currentResultSignal = signal({ id: 100, result_id: 100, result_level_id: 3 });
      fixture.detectChanges();

      const titles = Array.from(fixture.nativeElement.querySelectorAll('.tab-title')).map((el: any) => el.textContent.trim());
      expect(titles).toEqual(['Outcome N~1', 'Outcome N~2']);
    });

    it('renders "HLO N~X" when currentResult is an Output (result_level_id: 4)', () => {
      const apiMock = TestBed.inject(ApiService);
      apiMock.dataControlSE.currentResultSignal = signal({ id: 100, result_id: 100, result_level_id: 4 });
      fixture.detectChanges();

      const titles = Array.from(fixture.nativeElement.querySelectorAll('.tab-title')).map((el: any) => el.textContent.trim());
      expect(titles).toEqual(['HLO N~1', 'HLO N~2']);
    });

    it('falls back to input resultLevelId when currentResultSignal has no level (resultLevelId: 2 -> Outcome, resultLevelId: 1 -> HLO)', () => {
      const apiMock = TestBed.inject(ApiService);
      apiMock.dataControlSE.currentResultSignal = signal({ id: 100, result_id: 100 });

      component.resultLevelId = 2;
      fixture.detectChanges();
      expect(component.dynamicTabTitle()).toBe('Outcome');

      component.resultLevelId = 1;
      fixture.detectChanges();
      expect(component.dynamicTabTitle()).toBe('HLO');
    });
  });
});

// SBT-T-2 (P2-3542): the off-screen ToC gap source. `CPMultipleWPsComponent` registers a function
// with `DataControlService.registerOffscreenFeedback` on init and unregisters the SAME reference on
// destroy; the scan folds whatever that function returns into the bottom bar's "still missing" list.
// These tests exercise the publisher at that seam directly — by invoking the registered function —
// rather than through the full DOM scan, which belongs to `data-control.service.spec.ts` (SBT-T-1).
describe('CPMultipleWPsComponent — off-screen ToC gap source (SBT-T-2)', () => {
  let component: CPMultipleWPsComponent;
  let fixture: ComponentFixture<CPMultipleWPsComponent>;
  let registerOffscreenFeedback: jest.Mock;
  let unregisterOffscreenFeedback: jest.Mock;
  let registeredSource: (() => string[]) | undefined;

  // toc_level_id:2, toc_result_id:77, indicators[0].related_node_id:9 mirror the falsifier fixture
  // in tasks.md verbatim. `contributingIndicator` is the one field that varies between a complete
  // and an incomplete tab.
  const buildTab = (contributingIndicator: number | null) => ({
    toc_level_id: 2,
    toc_result_id: 77,
    indicators: [{ related_node_id: 9, targets: [{ contributing_indicator: contributingIndicator }] }]
  });

  // `isCP2026` is a dependency-less `computed` (`FieldsManagerService.isContributorsPartners2026()`
  // is a plain function, not signal-backed) — it caches its first read. The stub MUST be set before
  // `TestBed.createComponent`, never flipped on an already-created instance.
  const configure = async (isCP2026: boolean) => {
    registerOffscreenFeedback = jest.fn((source: () => string[]) => {
      registeredSource = source;
    });
    unregisterOffscreenFeedback = jest.fn();

    // result_level_id: 3 -> isOutput() false -> dynamicTabTitle() 'Outcome', matching the
    // falsifier's expected label verbatim.
    const currentResultSignal = signal({ id: 100, result_id: 100, result_level_id: 3 });

    const apiMock = {
      dataControlSE: {
        currentNotification: null,
        currentResult: { id: 100 },
        get currentResultSignal() {
          return currentResultSignal;
        },
        set currentResultSignal(val: any) {
          if (typeof val === 'function') {
            currentResultSignal.set(val());
          } else {
            currentResultSignal.set(val);
          }
        },
        registerOffscreenFeedback,
        unregisterOffscreenFeedback
      },
      tocApiSE: {
        GET_tocLevelsByconfig: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    await TestBed.configureTestingModule({
      declarations: [CPMultipleWPsComponent, StubMultipleWPsContentComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => isCP2026, isP25: () => false } },
        { provide: RdContributorsAndPartnersService, useValue: { savedActiveTabIndex: null, partnersBody: {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CPMultipleWPsComponent);
    component = fixture.componentInstance;
    component.editable = true;
    component.resultLevelId = 2;
    component.initiativeId = 5;
  };

  const mount = async (resultTocResults: any[]) => {
    component.initiative = {
      official_code: 'INIT-01',
      short_name: 'INIT',
      planned_result: true,
      result_toc_results: resultTocResults
    };
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => {
    registeredSource = undefined;
  });

  it('SBT-AC-1: two tabs, tab 2 incomplete, standing on tab 1 -> the gap is published and named', async () => {
    await configure(true);
    await mount([buildTab(5), buildTab(null)]);

    expect(component.activeTabIndex).toBe(0);
    expect(registerOffscreenFeedback).toHaveBeenCalledTimes(1);
    expect(registeredSource).toBeDefined();
    expect(registeredSource!()).toEqual(['Outcome N~2: Contribution to indicator target']);
  });

  it('SBT-AC-2: standing on tab 2, the rendered tab is NOT published too (no double count)', async () => {
    await configure(true);
    await mount([buildTab(5), buildTab(null)]);

    component.activeTabIndex = 1; // now rendering the incomplete tab; the DOM scan alone covers it
    expect(registeredSource!()).toEqual([]);
  });

  it('SBT-AC-3: both tabs complete -> nothing published', async () => {
    await configure(true);
    await mount([buildTab(5), buildTab(5)]);

    expect(registeredSource!()).toEqual([]);
  });

  it('SBT-AC-4: the active tab IS published while showMultipleWPsContent is false (the 50ms remount window)', async () => {
    await configure(true);
    await mount([buildTab(5), buildTab(null)]);

    component.activeTabIndex = 1;
    component.showMultipleWPsContent = false;

    expect(registeredSource!()).toEqual(['Outcome N~2: Contribution to indicator target']);
  });

  it('SBT-AC-5: a single incomplete tab publishes nothing (the DOM scan alone names it, as today)', async () => {
    await configure(true);
    await mount([buildTab(null)]);

    expect(registeredSource!()).toEqual([]);
  });

  it('SBT-AC-6: the source is gone after fixture.destroy()', async () => {
    await configure(true);
    await mount([buildTab(5), buildTab(null)]);

    const registered = registeredSource;
    fixture.destroy();

    expect(unregisterOffscreenFeedback).toHaveBeenCalledTimes(1);
    expect(unregisterOffscreenFeedback).toHaveBeenCalledWith(registered);
  });

  it('SBT-AC-7: isContributor publishes nothing, even with an incomplete off-screen tab', async () => {
    await configure(true);
    component.isContributor = true;
    await mount([buildTab(5), buildTab(null)]);

    expect(registeredSource!()).toEqual([]);
  });

  it('SBT-AC-8: isUnplanned publishes nothing', async () => {
    await configure(true);
    component.isUnplanned = true;
    await mount([buildTab(5), buildTab(null)]);

    expect(registeredSource!()).toEqual([]);
  });

  it('resolves labels in form order (Level -> Outcome/Output -> Contribution to indicator target)', async () => {
    await configure(true);
    await mount([buildTab(5), { toc_level_id: null, toc_result_id: null, indicators: [] }, { toc_level_id: 2, toc_result_id: null, indicators: [] }]);

    expect(registeredSource!()).toEqual(['Outcome N~2: Level', 'Outcome N~3: Outcome']);
  });
});
