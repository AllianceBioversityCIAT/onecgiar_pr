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
        }
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
