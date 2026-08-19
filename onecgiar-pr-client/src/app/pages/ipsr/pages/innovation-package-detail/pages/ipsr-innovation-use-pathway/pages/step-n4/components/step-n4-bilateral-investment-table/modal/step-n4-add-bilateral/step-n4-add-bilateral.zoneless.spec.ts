import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4AddBilateralComponent } from './step-n4-add-bilateral.component';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../../../../../../../shared/services/global/centers.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * `cleanObject()` toggles `showForm` `false -> setTimeout -> true` to remount the form. As a plain field the
 * delayed write notified nothing, so the "Add bilateral" dialog stayed empty after being closed and reopened.
 * This test drives the real `(onHide)` binding and asserts on the RENDERED DOM, not on the flag.
 *
 * Representative of the identical shape in step-n4-add-partner and step-n4-add-project.
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

describe('StepN4AddBilateralComponent (zoneless change detection)', () => {
  let component: StepN4AddBilateralComponent;
  let fixture: ComponentFixture<StepN4AddBilateralComponent>;

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
      declarations: [StepN4AddBilateralComponent, StubPrDialogComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: InstitutionsService, useValue: { institutionsList: [] } },
        { provide: CentersService, useValue: { centersList: [] } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4AddBilateralComponent);
    component = fixture.componentInstance;
    component.visible = true;
  });

  it('repaints the add-bilateral form after the dialog is closed and cleanObject() remounts it', async () => {
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
