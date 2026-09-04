import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ResultSectionsSidebarComponent } from './result-sections-sidebar.component';
import { ResultSectionsService } from './result-sections.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

describe('ResultSectionsSidebarComponent', () => {
  let fixture: ComponentFixture<ResultSectionsSidebarComponent>;
  let component: ResultSectionsSidebarComponent;
  let sectionsMock: any;
  let fieldsManagerMock: any;

  const html = () => fixture.nativeElement as HTMLElement;

  const build = async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ResultSectionsSidebarComponent],
      providers: [
        provideRouter([]),
        { provide: ResultSectionsService, useValue: sectionsMock },
        { provide: FieldsManagerService, useValue: fieldsManagerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultSectionsSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    sectionsMock = {
      isLoading: signal(false),
      sections: signal([
        { path: 'general-information', prName: 'General information', validation: 1 },
        { path: 'partners', prName: 'Partners', validation: 0 },
        { path: 'evidences', prName: 'Evidence', underConstruction: true }
      ]),
      doneCount: signal(1),
      totalCount: signal(2),
      progressWidth: signal('50%'),
      progressLabel: signal('1 of 2 sections complete'),
      sectionLink: (s: any) => `/result/result-detail/1234/${s.path}`,
      sectionQueryParams: () => ({ phase: 7 }),
      resultCode: signal('9006'),
      resultTypeName: signal('Capacity sharing for development'),
      statusLabel: signal('Editing'),
      statusFg: signal('var(--pr-status-in-progress-fg)'),
      statusBg: signal('var(--pr-status-in-progress-bg)'),
      showAiReview: true,
      aiReviewDisabled: false,
      aiReviewLabel: 'AI review',
      showSubmit: true,
      submitDisabled: false,
      showUnsubmit: false,
      unsubmitDisabled: false,
      incompleteTooltip: '',
      showQaAssessedNotice: false,
      showInQaNotice: false,
      runAiReview: jest.fn(),
      openSubmit: jest.fn(),
      openUnsubmit: jest.fn()
    };
    fieldsManagerMock = { isP25: signal(true), portfolioAcronym: signal('P25') };
  });

  it('creates', async () => {
    await build();

    expect(component).toBeTruthy();
    expect(html().querySelector('[data-testid="result-sections-sidebar"]')).toBeTruthy();
  });

  it('pins the result code, type and status above the section list', async () => {
    await build();

    expect(html().querySelector('[data-testid="result-sections-code"]')?.textContent?.trim()).toBe('Result code #9006');
    expect(html().querySelector('[data-testid="result-sections-type"]')?.textContent?.trim()).toBe(
      'Capacity sharing for development'
    );
    expect(html().querySelector('[data-testid="result-sections-status"]')?.textContent?.trim()).toBe('Editing');
  });

  it('hides the identity block when the open result has no code, type or status', async () => {
    sectionsMock.resultCode = signal('');
    sectionsMock.resultTypeName = signal('');
    sectionsMock.statusLabel = signal('');
    await build();

    expect(html().querySelector('[data-testid="result-sections-identity"]')).toBeNull();
  });

  it('renders one row per section, linking to it with the phase', async () => {
    await build();
    const rows = html().querySelectorAll('nav a');

    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('General information');
    expect(rows[0].getAttribute('href')).toBe('/result/result-detail/1234/general-information?phase=7');
  });

  it('marks the complete section with a check and the incomplete one with an empty ring', async () => {
    await build();
    const rows = html().querySelectorAll('nav a');

    expect(rows[0].querySelector('[aria-label="Section complete"]')).toBeTruthy();
    expect(rows[0].querySelector('.material-icons-round')?.textContent?.trim()).toBe('check');
    expect(rows[1].querySelector('[aria-label="Section incomplete"]')).toBeTruthy();
    expect(rows[1].querySelector('[aria-label="Section complete"]')).toBeFalsy();
  });

  it('shows the work-in-progress badge instead of a state marker on under-construction sections', async () => {
    await build();
    const wip = html().querySelectorAll('nav a')[2];

    expect(wip.querySelector('img[src="assets/work-in-progress.png"]')).toBeTruthy();
    expect(wip.querySelector('[aria-label="Section incomplete"]')).toBeFalsy();
  });

  it('renders the progress bar from the service', async () => {
    await build();
    const bar = html().querySelector('[role="progressbar"]') as HTMLElement;

    expect(bar.getAttribute('aria-valuenow')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('2');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('50%');
    expect(html().textContent).toContain('1 of 2 sections complete');
  });

  it('renders a skeleton row per expected section while the portfolio resolves', async () => {
    sectionsMock.isLoading = signal(true);
    await build();

    expect(html().querySelectorAll('nav a').length).toBe(0);
    expect(html().querySelectorAll('.pr-skeleton').length).toBe(5 * 2); // 5 P25 rows × line + marker
  });

  it('uses 7 skeleton rows outside P25', async () => {
    sectionsMock.isLoading = signal(true);
    fieldsManagerMock.isP25 = signal(false);
    await build();

    expect(html().querySelectorAll('.pr-skeleton').length).toBe(7 * 2);
  });

  it('delegates the AI review click', async () => {
    await build();
    (html().querySelector('[data-testid="result-sections-ai-review"]') as HTMLButtonElement).click();

    expect(sectionsMock.runAiReview).toHaveBeenCalled();
  });

  it('delegates the submit click', async () => {
    await build();
    (html().querySelector('[data-testid="result-sections-submit"]') as HTMLButtonElement).click();

    expect(sectionsMock.openSubmit).toHaveBeenCalled();
  });

  it('disables AI review and Submit when the service says so', async () => {
    sectionsMock.aiReviewDisabled = true;
    sectionsMock.submitDisabled = true;
    await build();

    expect((html().querySelector('[data-testid="result-sections-ai-review"]') as HTMLButtonElement).disabled).toBe(true);
    expect((html().querySelector('[data-testid="result-sections-submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('swaps Submit for Unsubmit on a submitted result', async () => {
    sectionsMock.showSubmit = false;
    sectionsMock.showUnsubmit = true;
    await build();

    expect(html().querySelector('[data-testid="result-sections-submit"]')).toBeFalsy();
    (html().querySelector('[data-testid="result-sections-unsubmit"]') as HTMLButtonElement).click();
    expect(sectionsMock.openUnsubmit).toHaveBeenCalled();
  });

  // P2-3434: a result under QA must not offer a clickable Unsubmit right above the QA notice.
  it('disables Unsubmit when the result is locked in QA', async () => {
    sectionsMock.showSubmit = false;
    sectionsMock.showUnsubmit = true;
    sectionsMock.unsubmitDisabled = true;
    sectionsMock.showInQaNotice = true;
    await build();

    const button = html().querySelector('[data-testid="result-sections-unsubmit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(html().textContent).toContain('This result is part of a QA process and cannot be un-submitted for editing.');
  });

  it('renders the QA notices when the service exposes them', async () => {
    sectionsMock.showQaAssessedNotice = true;
    sectionsMock.showInQaNotice = true;
    await build();

    expect(html().textContent).toContain('Quality Assessed results cannot be un-submited.');
    expect(html().textContent).toContain('This result is part of a QA process');
  });

  it('hides the AI review button when the result type does not support it', async () => {
    sectionsMock.showAiReview = false;
    await build();

    expect(html().querySelector('[data-testid="result-sections-ai-review"]')).toBeFalsy();
  });
});
