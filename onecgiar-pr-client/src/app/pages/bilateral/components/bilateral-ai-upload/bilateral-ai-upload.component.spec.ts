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
});
