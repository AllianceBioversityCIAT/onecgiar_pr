import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { RetrieveModalComponent } from './retrieve-modal.component';
import { RetrieveModalService } from './retrieve-modal.service';
import { RetrieveRequestBody } from './models/RetrieveRequestBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * `cleanObject()` toggles `showForm` `false -> setTimeout -> true` to remount the form. As a plain field the
 * delayed write notified nothing, so no second render pass ran and the dialog stayed painted on `false`.
 * This test drives the real `(onHide)` binding and asserts on the RENDERED DOM, not on the flag.
 *
 * Representative of the identical `showForm` shape in partners-request, step-n4-add-partner,
 * step-n4-add-bilateral and step-n4-add-project.
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

describe('RetrieveModalComponent (zoneless change detection)', () => {
  let component: RetrieveModalComponent;
  let fixture: ComponentFixture<RetrieveModalComponent>;

  const formEl = () => fixture.nativeElement.querySelector('.modal_container');
  const dialogStub = () => fixture.debugElement.children[0].componentInstance as StubPrDialogComponent;

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const apiMock = {
      resultsSE: {
        GET_AllInitiatives: () => of({ response: [{ initiative_id: 1, full_name: 'Initiative 1' }] }),
        POST_updateRequest: () => of({ response: { newResultHeader: { result_code: '123' } } })
      },
      alertsFe: { show: jest.fn() },
      rolesSE: { isAdmin: true },
      dataControlSE: { showRetrieveRequest: true, currentResult: {}, myInitiativesList: [] }
    };

    await TestBed.configureTestingModule({
      declarations: [RetrieveModalComponent, StubPrDialogComponent],
      imports: [CommonModule, RouterTestingModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: RetrieveModalService, useValue: { retrieveRequestBody: new RetrieveRequestBody() } },
        { provide: ResultLevelService, useValue: { resultBody: {} } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RetrieveModalComponent);
    component = fixture.componentInstance;
  });

  it('repaints the retrieve form after the dialog is closed and cleanObject() remounts it', async () => {
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
