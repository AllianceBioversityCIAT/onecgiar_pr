import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SubGeoscopeComponent } from './sub-geoscope.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * Picking a country hides the two dependent sub-national <app-pr-select>s and re-shows them 300 ms later
 * inside a `setTimeout`, so they remount empty against the newly fetched options. As plain fields the delayed
 * write notified nothing, so under zoneless change detection the dropdowns — and the row's delete button,
 * gated by the same flag — never came back. The flags are component fields, so they were made signal-backed.
 *
 * This test drives the real `(selectOptionEvent)` listener and asserts on the RENDERED DOM.
 */

@Component({
  selector: 'app-pr-select',
  template: '<div class="stub-select" [attr.data-label]="label"></div>',
  standalone: false
})
class StubPrSelectComponent {
  @Input() label: string;
  @Input() options: any[];
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() placeholder: string;
  @Input() isStatic: boolean;
  @Input() ngModel: any;
  @Output() ngModelChange = new EventEmitter<any>();
  @Output() selectOptionEvent = new EventEmitter<any>();
}

describe('SubGeoscopeComponent (zoneless change detection) — sub-national selects', () => {
  let fixture: ComponentFixture<SubGeoscopeComponent>;
  let component: SubGeoscopeComponent;

  const selectByLabel = (label: string) =>
    fixture.nativeElement.querySelector(`.stub-select[data-label="${label}"]`) as HTMLElement | null;
  const deleteIcon = () => fixture.nativeElement.querySelector('.delete') as HTMLElement | null;
  const countrySelect = () =>
    fixture.debugElement
      .queryAll(q => q.componentInstance instanceof StubPrSelectComponent)
      .find(de => de.componentInstance.label === 'Country');

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const apiMock = {
      resultsSE: {
        getSubNationalLevelOne: () => of({ response: [{ geonameId: 1, name: 'Level one', adminCode1: '01' }] }),
        getSubNationalLevelTwo: () => of({ response: [{ geonameId: 2, name: 'Level two' }] })
      },
      rolesSE: { readOnly: false }
    };

    await TestBed.configureTestingModule({
      declarations: [SubGeoscopeComponent, StubPrSelectComponent],
      imports: [CommonModule],
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: apiMock }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SubGeoscopeComponent);
    component = fixture.componentInstance;
    component.index = 0;
    component.body = { countries: [{ id: 7, name: 'Colombia', iso_alpha_2: 'CO' }], geoScopeSubNatinals: [] };
    component.countrySelected = 7;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders both sub-national selects to start with', () => {
    expect(selectByLabel('Sub-national level 1')).toBeTruthy();
    expect(selectByLabel('Sub-national level 2')).toBeTruthy();
    expect(deleteIcon()).toBeTruthy();
  });

  it('brings both sub-national selects back after picking a country', async () => {
    // Real flow: `(selectOptionEvent)="getSubNationalLevelOne(index)"` on the Country <app-pr-select>.
    countrySelect().componentInstance.selectOptionEvent.emit(7);
    await fixture.whenStable();

    // The remount hides them synchronously — the listener itself schedules that pass.
    expect(selectByLabel('Sub-national level 1')).toBeFalsy();
    expect(selectByLabel('Sub-national level 2')).toBeFalsy();
    expect(deleteIcon()).toBeFalsy();

    await tick(400);

    expect(component.showNationalLevelSelect).toBe(true);
    expect(component.showNationalLevelTwoSelect).toBe(true);
    // The regression: the flags flipped back but the row stayed painted without its dropdowns.
    expect(selectByLabel('Sub-national level 1')).toBeTruthy();
    expect(selectByLabel('Sub-national level 2')).toBeTruthy();
    expect(deleteIcon()).toBeTruthy();
  }, 15000);

  it('brings the level 2 select back after picking a sub-national level 1', async () => {
    // Whole flow driven through the template: pick a country first, which is what loads the level 1 options.
    countrySelect().componentInstance.selectOptionEvent.emit(7);
    await tick(400);

    component.subNationalOneSelected = 1;

    // Real flow: `(selectOptionEvent)="getSSubNationalLevelTwo(index)"` on the level 1 <app-pr-select>.
    fixture.debugElement
      .queryAll(q => q.componentInstance instanceof StubPrSelectComponent)
      .find(de => de.componentInstance.label === 'Sub-national level 1')
      .componentInstance.selectOptionEvent.emit(1);
    await fixture.whenStable();

    expect(selectByLabel('Sub-national level 2')).toBeFalsy();

    await tick(400);

    expect(component.showNationalLevelTwoSelect).toBe(true);
    // The regression: the level 2 dropdown never came back after choosing a level 1.
    expect(selectByLabel('Sub-national level 2')).toBeTruthy();
  }, 15000);
});
