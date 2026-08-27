import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvidenceItemComponent } from './evidence-item.component';
import { EvidencesCreateInterface } from '../model/evidencesBody.model';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * Dropping an unsupported file sets `incorrectFile = true` and clears it 3 s later from a
 * `setTimeout`. Before the fix `incorrectFile` was a plain field, so the delayed write notified
 * nothing and the "Incorrect format..." message stayed on screen forever. These tests drive the
 * real `(drop)` binding and assert on the RENDERED DOM, not on the flag.
 */
describe('EvidenceItemComponent (zoneless change detection)', () => {
  let component: EvidenceItemComponent;
  let fixture: ComponentFixture<EvidenceItemComponent>;

  const errorMessageEl = () => fixture.nativeElement.querySelector('.incorrect-file');
  const dropZoneEl = () => fixture.nativeElement.querySelector('.drag-and-drop-field') as HTMLElement;

  const wait = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  const dropFile = (name: string) => {
    const event: any = new Event('drop', { bubbles: true });
    event.dataTransfer = { files: [{ name, size: 1024 }] };
    dropZoneEl().dispatchEvent(event);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EvidenceItemComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: ApiService, useValue: { alertsFe: { show: jest.fn() }, rolesSE: { readOnly: false }, dataControlSE: { currentResult: {} } } },
        { provide: DataControlService, useValue: { isKnowledgeProduct: false, isInnoDev: false, isInnoUse: false } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EvidenceItemComponent);
    component = fixture.componentInstance;
    // Upload-file branch, question already answered and no file stored yet: that is the only state
    // where the drop zone and its error message exist in the template.
    component.evidence = { is_sharepoint: 1, is_public_file: false, sp_file_name: null } as unknown as EvidencesCreateInterface;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('hides the "Incorrect format" message 3 s after an unsupported file is dropped', async () => {
    expect(dropZoneEl()).toBeTruthy();
    expect(errorMessageEl()).toBeFalsy();

    dropFile('virus.exe');
    await fixture.whenStable();

    expect(errorMessageEl()).toBeTruthy();
    expect(errorMessageEl().textContent).toContain('Incorrect format');

    await wait(3100);

    expect(component.incorrectFile).toBe(false);
    // Fails without the fix: the flag flipped but nothing repainted, so the message was still there.
    expect(errorMessageEl()).toBeFalsy();
  }, 15000);

  it('drops the error styling from the drop zone once the timer clears the flag', async () => {
    dropFile('virus.exe');
    await fixture.whenStable();

    expect(dropZoneEl().classList).toContain('incorrect-drag-and-drop-field');

    await wait(3100);

    expect(dropZoneEl().classList).not.toContain('incorrect-drag-and-drop-field');
  }, 15000);
});
