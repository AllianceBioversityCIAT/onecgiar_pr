import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportNewResultButtonComponent } from './report-new-result-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';

describe('ReportNewResultButtonComponent', () => {
  let component: ReportNewResultButtonComponent;
  let fixture: ComponentFixture<ReportNewResultButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ReportNewResultButtonComponent,
        PrButtonComponent
      ],
      imports: [
        HttpClientTestingModule,
        TooltipModule
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportNewResultButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
