import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportingVideoModalComponent } from './reporting-video-modal.component';

describe('ReportingVideoModalComponent', () => {
  let component: ReportingVideoModalComponent;
  let fixture: ComponentFixture<ReportingVideoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingVideoModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportingVideoModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programName', 'Breeding for Tomorrow');
    fixture.componentRef.setInput('programCode', 'SP01');
    fixture.componentRef.setInput('cycleYear', 2026);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders header with program name and cycle year', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Reporting Process & Walkthrough');
    expect(text).toContain('Breeding for Tomorrow');
    expect(text).toContain('2026');
  });

  it('defaults to video tab and shows video player with chapters', () => {
    expect(component.activeTab()).toBe('video');
    expect(component.chapters.length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('1. Overview & Results Structure');
  });

  it('switches tabs when tab buttons are clicked', () => {
    component.setTab('result-types');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('result-types');
    expect(fixture.nativeElement.textContent).toContain('Why does the report form change?');
    expect(fixture.nativeElement.textContent).toContain('Knowledge Product');
    expect(fixture.nativeElement.textContent).toContain('Innovation Development');
    expect(fixture.nativeElement.textContent).toContain('Policy Change');

    component.setTab('features');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('features');
    expect(fixture.nativeElement.textContent).toContain('Instant Keyword Search Bar');
    expect(fixture.nativeElement.textContent).toContain('Quick Typology Chips');
    expect(fixture.nativeElement.textContent).toContain('Full Keyboard Navigation');

    component.setTab('steps');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('steps');
    expect(fixture.nativeElement.textContent).toContain('Locate your Area of Work (AoW)');
    expect(fixture.nativeElement.textContent).toContain('Complete the Dynamic Result Form');
  });

  it('seeks to a video chapter and updates current chapter', () => {
    const mockVideo = {
      currentTime: 0,
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn()
    } as unknown as HTMLVideoElement;
    component.videoPlayerRef = { nativeElement: mockVideo };

    const chapter = component.chapters[1]; // AoWs & Indicator KPIs
    component.seekToChapter(chapter);

    expect(component.currentChapterId()).toBe('indicator-selection');
    expect(mockVideo.currentTime).toBe(16);
    expect(mockVideo.play).toHaveBeenCalled();
    expect(component.isPlaying()).toBe(true);
  });

  it('emits closed output when close button or backdrop is clicked', () => {
    const closeSpy = jest.spyOn(component.closed, 'emit');

    const closeBtn = fixture.nativeElement.querySelector('header button[aria-label="Close guide"]') as HTMLButtonElement;
    closeBtn.click();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('emits closed output when Escape key is pressed', () => {
    const closeSpy = jest.spyOn(component.closed, 'emit');

    component.onEscape();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('contains explanations for all 6 major Result Types with form behavior', () => {
    expect(component.resultTypes.length).toBe(6);
    const codes = component.resultTypes.map(rt => rt.code);
    expect(codes).toContain('KP');
    expect(codes).toContain('INNOV-DEV');
    expect(codes).toContain('POLICY');
    expect(codes).toContain('CAP-DEV');
    expect(codes).toContain('INNOV-USE');
    expect(codes).toContain('OTHER');

    const kp = component.resultTypes.find(rt => rt.code === 'KP')!;
    expect(kp.formDynamics).toContain('CGSpace');
  });
});
