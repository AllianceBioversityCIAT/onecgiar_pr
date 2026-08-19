import { Component, Input, NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { ComplementaryInnovationComponent } from './complementary-innovation.component';
import { NewComplementaryInnovationComponent } from './components/new-complementary-innovation/new-complementary-innovation.component';
import { ComplementaryInnovationService } from './services/complementary-innovation.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * Opening an existing complementary innovation for edit sets `complementaryInnovationService.complementaries`
 * to `false` and back to `true` 100 ms later, inside a `setTimeout` nested in the GETComplementaryById
 * subscribe, so the "Function" checkbox list remounts against the freshly loaded selection. The flag lives on
 * a *service* and is read by a different component's template, so no signal owned by the writer could reach
 * it — the state itself was made signal-backed instead. Before the fix the delayed write notified nothing and
 * the checkbox list stayed blank until reload.
 *
 * This test drives the real `(click)` on the edit icon and asserts on the RENDERED DOM.
 */

@Component({
  selector: 'app-pr-dialog',
  template: '<ng-content></ng-content>',
  standalone: false
})
class StubPrDialogComponent {
  @Input() visible: boolean;
  @Input() modal: boolean;
  @Input() closeOnEscape: boolean;
  @Input() showHeader: boolean;
  @Input() dismissableMask: boolean;
  @Input() styleClass: string;
}

describe('ComplementaryInnovationComponent (zoneless change detection) — function checkboxes', () => {
  let fixture: ComponentFixture<ComplementaryInnovationComponent>;
  let component: ComplementaryInnovationComponent;
  let service: ComplementaryInnovationService;

  const checkboxes = () => fixture.nativeElement.querySelectorAll('input.pr-native-check');
  const editIcon = () => fixture.nativeElement.querySelector('.action_buttons .material-icons-round') as HTMLElement;

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    // Precondition only: one selected innovation so the edit icon is on screen. `ngOnInit` reloads this
    // list from the API, so it has to be seeded here rather than on the instance.
    const selectedInnovation = {
      result_id: '10',
      result_code: 'R-10',
      title: 'Innovation',
      initiative_official_code: 'INIT-01',
      result_type_id: 11
    };

    const apiMock = {
      isStepTwoOne: false,
      isStepTwoTwo: false,
      resultsSE: {
        GETInnovationPathwayStepTwoInnovationSelect: () => of({ response: [selectedInnovation] }),
        GETComplementataryInnovationFunctions: () =>
          of({ response: [{ complementary_innovation_functions_id: 1, name: 'Function A' }, { complementary_innovation_functions_id: 2, name: 'Function B' }] }),
        GETinnovationpathwayStepTwo: () => of({ response: [] }),
        GET_resultsLinked: () => of({ response: { links: [] } }),
        GETComplementaryById: () =>
          of({
            response: {
              findResult: { title: 'A complementary innovation', description: 'desc' },
              findResultComplementaryInnovation: {
                short_title: 'short',
                other_funcions: '',
                projects_organizations_working_on_innovation: true,
                specify_projects_organizations: ''
              },
              findComplementaryInnovationFuctions: [{ complementary_innovation_function_id: 1 }]
            }
          })
      },
      rolesSE: { readOnly: false, isAdmin: true, validateInitiative: () => true }
    };

    await TestBed.configureTestingModule({
      declarations: [ComplementaryInnovationComponent, NewComplementaryInnovationComponent, StubPrDialogComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        ComplementaryInnovationService,
        { provide: ApiService, useValue: apiMock },
        { provide: IpsrDataControlService, useValue: { detailData: {}, resultInnovationCode: 'IP-1', resultInnovationPhase: 1 } },
        { provide: Router, useValue: { navigate: jest.fn() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ComplementaryInnovationComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ComplementaryInnovationService);

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the function checkboxes before anything is edited', () => {
    expect(checkboxes().length).toBe(2);
  });

  it('brings the function checkboxes back after opening an innovation for edit', async () => {
    // Real flow: `(click)="getComplementaryInnovation(result.result_id, result)"` on the edit icon.
    editIcon().click();
    await fixture.whenStable();

    // The subscribe hides the list synchronously so it can remount.
    expect(checkboxes().length).toBe(0);

    await tick(200);

    expect(service.complementaries).toBe(true);
    // The regression: the flag flipped back but the checkbox list stayed off the screen.
    expect(checkboxes().length).toBe(2);
  }, 15000);
});
