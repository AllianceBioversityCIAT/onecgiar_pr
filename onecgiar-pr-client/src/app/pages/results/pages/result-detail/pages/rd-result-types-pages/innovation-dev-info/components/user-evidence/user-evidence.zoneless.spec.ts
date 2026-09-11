import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserEvidenceComponent } from './user-evidence.component';
import { EvidencesCreateInterface } from '../../../../../../result-detail/pages/rd-evidences/model/evidencesBody.model';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../../../../shared/services/data-control.service';

/**
 * P2-3322 — zoneless change detection regression guard (same case as EvidenceItemComponent).
 *
 * Dropping an unsupported file sets `incorrectFile = true` and clears it 3 s later from a
 * `setTimeout`. Before the fix `incorrectFile` was a plain field, so the delayed write notified
 * nothing and the "Incorrect format..." message stayed on screen forever. This test drives the real
 * `(drop)` binding and asserts on the RENDERED DOM, not on the flag.
 */
describe('UserEvidenceComponent (zoneless change detection)', () => {
  let component: UserEvidenceComponent;
  let fixture: ComponentFixture<UserEvidenceComponent>;

  const errorMessageEl = () => fixture.nativeElement.querySelector('.incorrect-file');
  const dropZoneEl = () => fixture.nativeElement.querySelector('.drag-and-drop-field') as HTMLElement;

  const wait = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserEvidenceComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: ApiService, useValue: { alertsFe: { show: jest.fn() }, rolesSE: { readOnly: false }, dataControlSE: { currentResult: {} } } },
        { provide: DataControlService, useValue: { isKnowledgeProduct: false, isInnoDev: false, isInnoUse: false } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(UserEvidenceComponent);
    component = fixture.componentInstance;
    component.evidence = { is_sharepoint: 1, is_public_file: false, sp_file_name: null } as unknown as EvidencesCreateInterface;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('hides the "Incorrect format" message 3 s after an unsupported file is dropped', async () => {
    expect(dropZoneEl()).toBeTruthy();
    expect(errorMessageEl()).toBeFalsy();

    const event: any = new Event('drop', { bubbles: true });
    event.dataTransfer = { files: [{ name: 'virus.exe', size: 1024 }] };
    dropZoneEl().dispatchEvent(event);
    await fixture.whenStable();

    expect(errorMessageEl()).toBeTruthy();
    expect(dropZoneEl().classList).toContain('incorrect-drag-and-drop-field');

    await wait(3100);

    expect(component.incorrectFile).toBe(false);
    // Fails without the fix: the flag flipped but nothing repainted.
    expect(errorMessageEl()).toBeFalsy();
    expect(dropZoneEl().classList).not.toContain('incorrect-drag-and-drop-field');
  }, 15000);
});
