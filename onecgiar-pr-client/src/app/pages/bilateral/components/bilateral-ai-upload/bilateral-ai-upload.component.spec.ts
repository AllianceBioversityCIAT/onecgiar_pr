import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { BilateralAiUploadComponent } from './bilateral-ai-upload.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { RawBilateralAiJob } from '../../bilateral-ai-job.model';

describe('BilateralAiUploadComponent', () => {
  let component: BilateralAiUploadComponent;
  let fixture: ComponentFixture<BilateralAiUploadComponent>;
  let activatedRouteStub: { snapshot: { queryParams: Record<string, string> } };
  let bilateralApi: {
    GET_bilateralAiJobs: jest.Mock;
    GET_bilateralAiJob: jest.Mock;
    GET_bilateralAiDrafts: jest.Mock;
    GET_bilateralAiDraft: jest.Mock;
    POST_bilateralAiJob: jest.Mock;
    POST_bilateralAiJobRetry: jest.Mock;
    GET_bilateralAiJobExpectations: jest.Mock;
  };
  let router: { navigate: jest.Mock };

  const job = (overrides: Partial<RawBilateralAiJob> = {}): RawBilateralAiJob => ({
    job_id: 'job-1',
    user_id: '1',
    center_id: '1',
    project_id: '1',
    program_code: 'SP-01',
    bucket_name: 'bucket',
    document_keys: [],
    audio_keys: [],
    text_context: null,
    status: 'PROCESSING',
    stage: 'extracting',
    stage_updated_date: null,
    attempts: '1',
    max_attempts: '3',
    retrying: 0,
    queue_position: null,
    external_interaction_id: null,
    response_snapshot: null,
    result_count: '0',
    error_code: null,
    error_message: null,
    created_date: '2026-09-15T10:00:00.000Z',
    started_date: '2026-09-15T10:00:00.000Z',
    completed_date: null,
    retried_date: null,
    last_updated_date: '2026-09-15T10:00:00.000Z',
    ...overrides,
  });

  /** Lets the `await toPromise()` inside `BilateralAiService.pollJob` settle. */
  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };

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
    activatedRouteStub = { snapshot: { queryParams: {} } };
    router = { navigate: jest.fn().mockResolvedValue(true) };
    bilateralApi = {
      GET_bilateralAiJobs: jest.fn().mockReturnValue(of({ response: { jobs: [], summary: { lanes_total: 2, lanes_busy: 0, others_waiting: 0 } } })),
      GET_bilateralAiJob: jest.fn().mockReturnValue(of({ response: job() })),
      GET_bilateralAiDrafts: jest.fn().mockReturnValue(of([])),
      GET_bilateralAiDraft: jest.fn().mockReturnValue(of({ response: null })),
      POST_bilateralAiJob: jest.fn().mockReturnValue(of({ response: { jobId: 'job-1' } })),
      POST_bilateralAiJobRetry: jest.fn().mockReturnValue(of({ response: { jobId: 'job-1', jobStatus: 'PENDING' } })),
      GET_bilateralAiJobExpectations: jest.fn().mockReturnValue(of({ response: { mix: 'documents', sampleSize: 0, p25Minutes: null, p75Minutes: null } })),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralAiUploadComponent, NoopAnimationsModule],
      providers: [
        PrToastService,
        BilateralCreationService,
        BilateralAiService,
        BilateralContextService,
        { provide: BilateralApiService, useValue: bilateralApi },
        {
          provide: ResultsApiService,
          useValue: { GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })), GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] })) },
        },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: router },
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

  // ── AIQ-T-7: never-blocking upload — the form always stays mounted ─────

  describe('AIQ-T-7: never-blocking upload (AIQ-R-7)', () => {
    const selectProjectAndSp = () => {
      const creationService = TestBed.inject(BilateralCreationService);
      creationService.selectProject({
        id: 1,
        shortName: 'P2',
        fullName: 'Project Two',
        summary: null,
        description: null,
        leadCenter: { id: 66, name: 'ILRI', acronym: 'ILRI' },
        sciencePrograms: [],
      } as never);
      creationService.selectPrimarySp({ programId: 1, programCode: 'SP-01', allocation: '100' });
    };

    it(
      'after a 202: resets the form to empty, keeps the real file input enabled and submittable, ' +
        'shows the confirmation, fires a View-action toast, and never mounts the processing panel',
      () => {
        selectProjectAndSp();
        const aiService = TestBed.inject(BilateralAiService);
        const addSubmittedJobSpy = jest.spyOn(aiService, 'addSubmittedJob');
        const openDrawerSpy = jest.spyOn(aiService, 'openDrawer');
        const toastService = TestBed.inject(PrToastService);
        const toastSpy = jest.spyOn(toastService, 'add');

        addFile('doc.pdf', 1000, 'document');
        fixture.detectChanges();
        expect(component.canSubmit()).toBe(true);

        component.onSubmit();
        fixture.detectChanges();

        expect(addSubmittedJobSpy).toHaveBeenCalledWith({ jobId: 'job-1' });
        expect(component.fileList().length).toBe(0);
        expect(component.contextText()).toBe('');

        // Disqualifier: assert the REAL file input, not a CSS class.
        const fileInput: HTMLInputElement | null = fixture.nativeElement.querySelector('input[type="file"]');
        expect(fileInput).toBeTruthy();
        expect(fileInput!.disabled).toBe(false);

        const confirmation = fixture.nativeElement.querySelector('[data-testid="aiu-confirmation-card"]');
        expect(confirmation).toBeTruthy();
        expect(confirmation.textContent).toContain('P2 was added to the AI queue');

        expect(fixture.nativeElement.querySelector('app-ai-processing-panel')).toBeNull();

        expect(toastSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'globalUserNotification',
            severity: 'success',
            summary: 'P2 was added to the AI queue',
            action: expect.objectContaining({ label: 'View' }),
          }),
        );

        const runAction = toastSpy.mock.calls[0][0].action?.run;
        runAction?.();
        expect(openDrawerSpy).toHaveBeenCalledWith();

        // Reviewer FAIL issue 2 (attempt 2): `AIQ-R-7` A says "the upload form is available and
        // submittable" — proven by actually submitting a SECOND time, not merely by the file
        // input's `disabled` attribute (which this component never sets on the input anyway).
        // `canSubmit()` was only asserted BEFORE the first submit in attempt 1; assert it again
        // here, after the 202 reset, and drive a real second submission through it.
        addFile('doc2.pdf', 1000, 'document');
        fixture.detectChanges();
        expect(component.canSubmit()).toBe(true);

        const submitButton: HTMLButtonElement | null = fixture.nativeElement.querySelector('.aiu-submit-btn');
        expect(submitButton).toBeTruthy();
        expect(submitButton!.disabled).toBe(false);

        component.onSubmit();
        fixture.detectChanges();

        expect(bilateralApi.POST_bilateralAiJob).toHaveBeenCalledTimes(2);
      },
    );

    it('a failed submit keeps the files and text — no job is added (AIQ-R-7 C)', () => {
      selectProjectAndSp();
      const aiService = TestBed.inject(BilateralAiService);
      const addSubmittedJobSpy = jest.spyOn(aiService, 'addSubmittedJob');
      bilateralApi.POST_bilateralAiJob.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: {} })));

      addFile('doc.pdf', 1000, 'document');
      component.contextText.set('some context');
      fixture.detectChanges();

      component.onSubmit();
      fixture.detectChanges();

      expect(addSubmittedJobSpy).not.toHaveBeenCalled();
      expect(component.fileList().length).toBe(1);
      expect(component.contextText()).toBe('some context');
      expect(component.justSubmittedProjectName()).toBeNull();
    });

    it('"Open AI processes" dismisses the confirmation and opens the drawer', () => {
      selectProjectAndSp();
      const aiService = TestBed.inject(BilateralAiService);
      const openDrawerSpy = jest.spyOn(aiService, 'openDrawer');
      addFile('doc.pdf', 1000, 'document');
      component.onSubmit();
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="aiu-confirmation-open-drawer"]').click();
      fixture.detectChanges();

      expect(openDrawerSpy).toHaveBeenCalledWith();
      expect(component.justSubmittedProjectName()).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="aiu-confirmation-card"]')).toBeNull();
    });

    // P2-3853: a host that is itself a drawer (bilateral-manual-create-drawer-host) needs to close
    // before the AI processes dialog opens on top of it. `onOpenAiProcesses` is the one place both
    // the confirmation card's button and the toast's View action route through.
    it('P2-3853: onOpenAiProcesses emits openedAiProcesses once and calls openDrawer once', () => {
      const openedSpy = jest.fn();
      component.openedAiProcesses.subscribe(openedSpy);
      const aiService = TestBed.inject(BilateralAiService);
      const openDrawerSpy = jest.spyOn(aiService, 'openDrawer');

      component.onOpenAiProcesses();

      expect(openedSpy).toHaveBeenCalledTimes(1);
      expect(openDrawerSpy).toHaveBeenCalledTimes(1);
    });

    it('"Choose another project" dismisses the confirmation and emits chooseAnotherProject', () => {
      selectProjectAndSp();
      const emitted = jest.fn();
      component.chooseAnotherProject.subscribe(emitted);
      addFile('doc.pdf', 1000, 'document');
      component.onSubmit();
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="aiu-confirmation-choose-another"]').click();
      fixture.detectChanges();

      expect(emitted).toHaveBeenCalled();
      expect(component.justSubmittedProjectName()).toBeNull();
    });

    // Falsifier 1: restoring `@if (uploadState().status === 'idle' || uploadState().status ===
    // 'uploading')` around the form must turn this red — every non-idle/uploading status used to
    // hide the whole card.
    it.each(['pending', 'processing', 'still_running', 'failed', 'completed', 'completed_no_candidates'])(
      'FALSIFIER GUARD: the form stays mounted for a status the old wrapper used to hide it for (%s)',
      status => {
        const aiService = TestBed.inject(BilateralAiService);
        aiService.setUploadStatus(status as never);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('app-ai-processing-panel')).toBeNull();
      },
    );

    it('`?job=` on init opens the drawer highlighting that job', () => {
      const aiService = TestBed.inject(BilateralAiService);
      const openDrawerSpy = jest.spyOn(aiService, 'openDrawer');
      activatedRouteStub.snapshot.queryParams = { job: 'job-42' };

      component.ngOnInit();

      expect(openDrawerSpy).toHaveBeenCalledWith('job-42');
    });

    it('does nothing on init without `?job=`', () => {
      const aiService = TestBed.inject(BilateralAiService);
      const openDrawerSpy = jest.spyOn(aiService, 'openDrawer');

      component.ngOnInit();

      expect(openDrawerSpy).not.toHaveBeenCalled();
    });
  });

  describe('Audio voice recording & error handling', () => {
    let originalMediaDevices: unknown;
    let originalMediaRecorder: unknown;

    beforeEach(() => {
      originalMediaDevices = navigator.mediaDevices;
      originalMediaRecorder = (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder;
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        configurable: true,
        writable: true,
      });
      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = originalMediaRecorder;
    });

    it('handles unsupported getUserMedia or insecure context with inline error and globalUserNotification toast', async () => {
      const toastService = TestBed.inject(PrToastService);
      const toastSpy = jest.spyOn(toastService, 'add');

      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
      });

      await component.startRecording();
      fixture.detectChanges();

      expect(component.recordingError()).toMatch(/secure connection|not supported/i);
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'globalUserNotification',
          severity: 'error',
          summary: 'Recording unavailable',
        }),
      );

      const alert = fixture.nativeElement.querySelector('.aiu-alert--error');
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Microphone Access Issue');

      component.clearRecordingError();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.aiu-alert--error')).toBeNull();
    });

    it('handles microphone permission denial (NotAllowedError) gracefully', async () => {
      const toastService = TestBed.inject(PrToastService);
      const toastSpy = jest.spyOn(toastService, 'add');

      const mockGetUserMedia = jest.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = class MockMediaRecorder {
        static isTypeSupported = jest.fn().mockReturnValue(true);
      };

      await component.startRecording();
      fixture.detectChanges();

      expect(component.recordingError()).toContain('Microphone access was denied');
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'globalUserNotification',
          severity: 'error',
          summary: 'Recording failed',
          detail: expect.stringContaining('denied'),
        }),
      );
    });

    it('prevents recording when source count limit is reached', async () => {
      const toastService = TestBed.inject(PrToastService);
      const toastSpy = jest.spyOn(toastService, 'add');

      // Add 6 dummy files
      for (let i = 0; i < 6; i++) {
        addFile(`file${i}.pdf`, 100, 'document');
      }

      await component.startRecording();

      expect(component.isRecording()).toBe(false);
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'globalUserNotification',
          severity: 'warn',
          summary: 'Limit reached',
        }),
      );
    });

    it('successfully records audio, tracks duration, and saves file with globalUserNotification toast', async () => {
      const toastService = TestBed.inject(PrToastService);
      const toastSpy = jest.spyOn(toastService, 'add');

      const mockTrack = { stop: jest.fn() };
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack]),
      };
      const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = class MockMediaRecorder {
        static isTypeSupported = jest.fn().mockReturnValue(true);
        state = 'inactive';
        mimeType = 'audio/webm';
        ondataavailable: ((e: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;

        start = jest.fn().mockImplementation(() => {
          this.state = 'recording';
        });

        stop = jest.fn().mockImplementation(() => {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob(['dummy audio content'], { type: 'audio/webm' }) });
          }
          if (this.onstop) {
            this.onstop();
          }
        });
      };

      await component.startRecording();
      fixture.detectChanges();

      expect(component.isRecording()).toBe(true);
      expect(fixture.nativeElement.querySelector('.aiu-recording-studio')).toBeTruthy();

      // Stop recording
      component.stopRecording();
      fixture.detectChanges();

      expect(component.isRecording()).toBe(false);
      expect(component.recordingSaved()).toBe(true);
      expect(component.fileList().length).toBe(1);
      expect(component.fileList()[0].type).toBe('audio');
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'globalUserNotification',
          severity: 'success',
          summary: 'Recording saved',
        }),
      );
    });

    it('cancels active recording without saving a file', async () => {
      const mockTrack = { stop: jest.fn() };
      const mockStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack]),
      };
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn().mockResolvedValue(mockStream) },
        configurable: true,
      });

      (globalThis as unknown as { MediaRecorder?: unknown }).MediaRecorder = class MockMediaRecorder {
        static isTypeSupported = jest.fn().mockReturnValue(true);
        state = 'recording';
        start = jest.fn();
        stop = jest.fn();
        ondataavailable = null;
        onstop = jest.fn();
      };

      await component.startRecording();
      expect(component.isRecording()).toBe(true);

      component.cancelRecording();
      fixture.detectChanges();

      expect(component.isRecording()).toBe(false);
      expect(component.fileList().length).toBe(0);
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });
});
