import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { BilateralAiUploadComponent } from './bilateral-ai-upload.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';

describe('BilateralAiUploadComponent', () => {
  let component: BilateralAiUploadComponent;
  let fixture: ComponentFixture<BilateralAiUploadComponent>;

  beforeAll(() => {
    // jsdom ships no crypto.randomUUID; the component uses it to key file rows.
    if (typeof globalThis.crypto?.randomUUID !== 'function') {
      let counter = 0;
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          ...(globalThis.crypto ?? {}),
          randomUUID: () => `test-uuid-${counter++}`,
        },
        configurable: true,
      });
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralAiUploadComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PrToastService,
        BilateralCreationService,
        BilateralAiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralAiUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty file list', () => {
    expect(component.fileList().length).toBe(0);
  });

  it('should format file sizes correctly', () => {
    expect(component.formatSize(0)).toBe('0 B');
    expect(component.formatSize(1024)).toBe('1.0 KB');
    expect(component.formatSize(1048576)).toBe('1.0 MB');
  });

  it('should not submit without files or text', () => {
    expect(component.canSubmit()).toBe(false);
  });

  it('P2-3103 AC2: should show the reporting-on-behalf-of note with the center full name', () => {
    const creationService = TestBed.inject(BilateralCreationService);
    creationService.selectProject({
      id: 1,
      shortName: 'P1',
      fullName: 'Full Project',
      summary: null,
      description: null,
      leadCenter: {
        id: 66,
        name: 'International Livestock Research Institute',
        acronym: 'ILRI',
      },
      sciencePrograms: [],
    } as never);
    fixture.detectChanges();

    expect(component.reportingCenterName()).toBe(
      'International Livestock Research Institute',
    );
    const note: HTMLElement = fixture.nativeElement.querySelector(
      '.aiu-info-note',
    );
    expect(note).toBeTruthy();
    expect(note.textContent).toContain('You are reporting on behalf of');
    expect(note.textContent).toContain(
      'International Livestock Research Institute',
    );
  });

  it('P2-3103 AC2: should not render the note without a selected center', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aiu-info-note')).toBeNull();
  });

  // ── P2-3437 #5: the screen must not advertise limits the server rejects ──
  // Server authority: bilateral-ai-file-storage.service.ts:19 (25_000_000 bytes),
  // :20 + :28 (6 sources = documents + audio + text), :59 (50_000 chars).

  const makeFile = (name: string, size: number): File => {
    const file = new File(['x'], name);
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  const addFile = (name: string, size: number, type: 'document' | 'audio') => {
    (component as never as { addFile(f: File, t: string): void }).addFile(
      makeFile(name, size),
      type,
    );
  };

  it('P2-3437: rejects a document over the server 25 MB cap', () => {
    addFile('big.pdf', 25_000_001, 'document');
    expect(component.fileList().length).toBe(0);
  });

  it('P2-3437: accepts a document right at the server 25 MB cap', () => {
    addFile('ok.pdf', 25_000_000, 'document');
    expect(component.fileList().length).toBe(1);
  });

  it('P2-3437: rejects audio over 25 MB — the old 100 MB audio allowance is gone', () => {
    addFile('long.mp3', 30_000_000, 'audio');
    expect(component.fileList().length).toBe(0);
  });

  it('P2-3437: counts the additional-context text as one source, like the server', () => {
    for (let i = 0; i < 5; i += 1) addFile(`doc${i}.pdf`, 1000, 'document');
    expect(component.sourceCount()).toBe(5);

    component.contextText.set('some context');
    expect(component.sourceCount()).toBe(6);
    expect(component.canAddMore()).toBe(false);

    addFile('sixth.pdf', 1000, 'document');
    expect(component.fileList().length).toBe(5);
    expect(component.canSubmit()).toBe(true);
  });

  it('P2-3437: blocks submitting 6 files plus text — the server would answer 400', () => {
    for (let i = 0; i < 6; i += 1) addFile(`doc${i}.pdf`, 1000, 'document');
    expect(component.canSubmit()).toBe(true);

    component.contextText.set('one source too many');
    fixture.detectChanges();

    expect(component.sourceCount()).toBe(7);
    expect(component.tooManySources()).toBe(true);
    expect(component.canSubmit()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.aiu-limit-warning'),
    ).toBeTruthy();
  });

  it('P2-3437: blocks context text longer than the server 50,000-character cap', () => {
    component.contextText.set('a'.repeat(50_001));
    expect(component.textTooLong()).toBe(true);
    expect(component.canSubmit()).toBe(false);
  });

  it('P2-3437: the help text quotes the real server limits', () => {
    const tags: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.aiu-limit-tag'),
    );
    const text = tags.map(t => t.textContent ?? '').join(' | ');

    expect(text).toContain('25 MB');
    expect(text).not.toContain('50 MB');
    expect(text).not.toContain('100 MB');
    expect(text).toContain('6 sources');
    expect(text).toContain('XLSX');
    expect(text).toContain('FLAC');
  });
});
