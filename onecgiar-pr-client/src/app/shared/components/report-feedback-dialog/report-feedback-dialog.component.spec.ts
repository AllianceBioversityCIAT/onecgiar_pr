import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ReportFeedbackDialogComponent } from './report-feedback-dialog.component';
import { FeedbackApiService, FeedbackReport } from '../../services/api/feedback-api.service';
import { ConsoleCaptureService } from '../../services/console-capture.service';

const report = (over: Partial<FeedbackReport> = {}): FeedbackReport => ({
  issueKey: 'P2-1',
  issueUrl: 'https://jira/browse/P2-1',
  title: 'The save button does nothing',
  type: 'Bug',
  stage: 'Received',
  released: false,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  resolvedAt: null,
  ...over
});

describe('ReportFeedbackDialogComponent', () => {
  let fixture: ComponentFixture<ReportFeedbackDialogComponent>;
  let component: ReportFeedbackDialogComponent;
  let api: jest.Mocked<Pick<FeedbackApiService, 'POST_reportFeedback' | 'GET_myFeedbackReports' | 'GET_similarFeedbackReports' | 'POST_meTooFeedback'>>;

  beforeEach(async () => {
    api = {
      POST_reportFeedback: jest.fn().mockReturnValue(of({ response: { issueKey: 'P2-9', issueUrl: 'u', type: 'bug' } })),
      GET_myFeedbackReports: jest.fn().mockReturnValue(of({ response: [report()] })),
      GET_similarFeedbackReports: jest.fn().mockReturnValue(of({ response: [report({ issueKey: 'P2-2' })] })),
      POST_meTooFeedback: jest.fn().mockReturnValue(of({ response: { issueKey: 'P2-2', issueUrl: 'u2' } }))
    } as any;

    await TestBed.configureTestingModule({
      imports: [ReportFeedbackDialogComponent],
      providers: [
        { provide: FeedbackApiService, useValue: api },
        { provide: ConsoleCaptureService, useValue: { snapshot: () => ['[10:00:00] ERROR boom'] } }
      ]
    })
      // The real template pulls in CustomFieldsModule and the dialog shell; this
      // spec is about behaviour, so the view is stubbed out.
      .overrideComponent(ReportFeedbackDialogComponent, {
        set: { template: '', imports: [], schemas: [NO_ERRORS_SCHEMA] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReportFeedbackDialogComponent);
    component = fixture.componentInstance;
  });

  it('does not allow submitting without a title and a description', () => {
    expect(component.canSubmit).toBe(false);
    component.title.set('Something broke');
    expect(component.canSubmit).toBe(false);
    component.description.set('It broke when I saved');
    expect(component.canSubmit).toBe(true);
  });

  it('treats whitespace as empty', () => {
    component.title.set('   ');
    component.description.set('   ');
    expect(component.canSubmit).toBe(false);
  });

  it('sends the chosen type, priority and the console buffer', () => {
    component.type.set('adjustment');
    component.priority.set('1');
    component.title.set('Rename the column');
    component.description.set('It says programme, not Program');
    component.submit();

    const body = api.POST_reportFeedback.mock.calls[0][0];
    expect(body.type).toBe('adjustment');
    expect(body.priority).toBe('1');
    expect(body.consoleLogs).toEqual(['[10:00:00] ERROR boom']);
    expect(component.createdIssueKey()).toBe('P2-9');
  });

  it('does NOT attach the screenshot unless the user ticks the box', () => {
    // The guard for "espero que no subas nada personal mio" (Yeck, 3-sep-2026):
    // a capture exists, but an untouched form must not ship it.
    fixture.componentRef.setInput('autoScreenshot', 'data:image/png;base64,AAA');
    component.title.set('t');
    component.description.set('d');

    expect(component.includeScreenshot()).toBe(false);
    component.submit();
    expect(api.POST_reportFeedback.mock.calls[0][0].attachments).toHaveLength(0);
  });

  it('attaches it once the user ticks the box', () => {
    fixture.componentRef.setInput('autoScreenshot', 'data:image/png;base64,AAA');
    component.title.set('t');
    component.description.set('d');
    component.includeScreenshot.set(true);
    component.submit();

    const sent = api.POST_reportFeedback.mock.calls[0][0].attachments;
    expect(sent).toHaveLength(1);
    expect(sent![0].name).toBe('screen-at-report-time.png');
  });

  it('surfaces a message when the report fails, and stops spinning', () => {
    api.POST_reportFeedback.mockReturnValueOnce(throwError(() => new Error('500')));
    component.title.set('t');
    component.description.set('d');
    component.submit();

    expect(component.submitting()).toBe(false);
    expect(component.errorMsg()).toContain('went wrong');
    expect(component.createdIssueKey()).toBeNull();
  });

  it('only looks for duplicates once the title is long enough, and debounces', () => {
    jest.useFakeTimers();
    component.onTitleChange('save');
    jest.advanceTimersByTime(600);
    expect(api.GET_similarFeedbackReports).not.toHaveBeenCalled();

    component.onTitleChange('save button');
    component.onTitleChange('save button does nothing');
    jest.advanceTimersByTime(600);

    expect(api.GET_similarFeedbackReports).toHaveBeenCalledTimes(1);
    expect(api.GET_similarFeedbackReports).toHaveBeenCalledWith('save button does nothing');
    expect(component.similar()).toHaveLength(1);
    jest.useRealTimers();
  });

  it('stays silent when the duplicate lookup fails — it is an aid, not a gate', () => {
    jest.useFakeTimers();
    api.GET_similarFeedbackReports.mockReturnValueOnce(throwError(() => new Error('500')));
    component.onTitleChange('save button does nothing');
    jest.advanceTimersByTime(600);

    expect(component.similar()).toEqual([]);
    expect(component.errorMsg()).toBeNull();
    jest.useRealTimers();
  });

  it('joining an existing report does not file a new one', () => {
    component.joinReport(report({ issueKey: 'P2-2' }));

    expect(api.POST_meTooFeedback).toHaveBeenCalledWith('P2-2');
    expect(api.POST_reportFeedback).not.toHaveBeenCalled();
    expect(component.joinedExisting()).toBe(true);
    expect(component.createdIssueKey()).toBe('P2-2');
  });

  it('loads the reports when switching to the view mode', () => {
    component.setMode('view');
    expect(api.GET_myFeedbackReports).toHaveBeenCalled();
    expect(component.myReports()).toHaveLength(1);
    expect(component.loadingReports()).toBe(false);
  });

  it('reports a load failure instead of showing an empty list', () => {
    api.GET_myFeedbackReports.mockReturnValueOnce(throwError(() => new Error('500')));
    component.setMode('view');

    expect(component.reportsError()).toContain('could not load');
    expect(component.myReports()).toEqual([]);
  });

  it('rejects non-images and oversized files', () => {
    const pdf = new File(['x'], 'notes.pdf', { type: 'application/pdf' });
    component.onFilesSelected({ target: { files: [pdf], value: '' } } as any);
    expect(component.userFiles()).toHaveLength(0);
    expect(component.fileError()).toContain('Only images');

    const huge = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    component.onFilesSelected({ target: { files: [huge], value: '' } } as any);
    expect(component.userFiles()).toHaveLength(0);
    expect(component.fileError()).toContain('over 5MB');
  });

  it('clears everything when reopened, so the next report starts blank', () => {
    component.type.set('adjustment');
    component.title.set('old');
    component.description.set('old');
    component.priority.set('1');
    component.includeScreenshot.set(true);
    component.shotExpanded.set(true);
    component.createdIssueKey.set('P2-9');
    component.setMode('view');

    component.visible = true;

    expect(component.mode()).toBe('report');
    expect(component.type()).toBe('bug');
    expect(component.title()).toBe('');
    expect(component.description()).toBe('');
    expect(component.priority()).toBe('3');
    expect(component.createdIssueKey()).toBeNull();
    expect(component.similar()).toEqual([]);
    expect(component.includeScreenshot()).toBe(false);
    expect(component.shotExpanded()).toBe(false);
  });
});
