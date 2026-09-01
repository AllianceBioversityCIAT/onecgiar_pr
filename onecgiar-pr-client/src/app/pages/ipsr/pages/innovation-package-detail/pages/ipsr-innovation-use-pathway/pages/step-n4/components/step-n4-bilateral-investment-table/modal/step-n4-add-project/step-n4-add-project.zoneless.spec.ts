import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4AddProjectComponent } from './step-n4-add-project.component';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../../../../../../../shared/services/global/centers.service';
import { RdContributorsAndPartnersService } from '../../../../../../../../../../../results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * `cleanObject()` toggles `showForm` `false -> setTimeout -> true` to remount the form. As a plain field the
 * delayed write notified nothing, so the "Add project" dialog stayed empty after being closed and reopened,
 * until the page was reloaded. The fix is the signal-backed `_showForm`, and only a test that drives the real
 * `(onHide)` binding and reads the RENDERED DOM can catch it going away: asserting on `component.showForm`
 * passes with the bug present, because the flag was always correct — what never happened was the repaint.
 *
 * Twin of `step-n4-add-bilateral.zoneless.spec.ts`.
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
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onHide = new EventEmitter<void>();
}

describe('StepN4AddProjectComponent (zoneless change detection)', () => {
  let component: StepN4AddProjectComponent;
  let fixture: ComponentFixture<StepN4AddProjectComponent>;

  const formEl = () => fixture.nativeElement.querySelector('.modal_container');
  const dialogStub = () => fixture.debugElement.children[0].componentInstance as StubPrDialogComponent;

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const apiMock = {
      rolesSE: { readOnly: false },
      alertsFe: { show: jest.fn() },
      dataControlSE: { someMandatoryFieldIncomplete: () => false },
      resultsSE: {}
    };

    await TestBed.configureTestingModule({
      declarations: [StepN4AddProjectComponent, StubPrDialogComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: InstitutionsService, useValue: { institutionsList: [] } },
        { provide: CentersService, useValue: { centersList: [] } },
        // `ngOnInit` loads the CLARISA project catalogue and `filterProjects()` reads it on every render.
        { provide: RdContributorsAndPartnersService, useValue: { loadClarisaProjects: jest.fn(), clarisaProjectsList: [] } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4AddProjectComponent);
    component = fixture.componentInstance;
    component.visible = true;
  });

  it('repaints the add-project form after the dialog is closed and cleanObject() remounts it', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(formEl()).toBeTruthy();

    // Real flow: `(onHide)="cleanObject()"` on <app-pr-dialog>.
    dialogStub().onHide.emit();
    await fixture.whenStable();

    expect(formEl()).toBeFalsy();

    await tick(50);

    expect(component.showForm).toBe(true);
    expect(formEl()).toBeTruthy();
  });
});
