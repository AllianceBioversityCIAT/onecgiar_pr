import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MyDraftResultsComponent } from './my-draft-results.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';

describe('MyDraftResultsComponent', () => {
  let component: MyDraftResultsComponent;
  let fixture: ComponentFixture<MyDraftResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyDraftResultsComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        BilateralAiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyDraftResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format dates correctly', () => {
    expect(component.formatDate(new Date().toISOString())).toBe('Today');
  });

  it('should return correct completeness label', () => {
    expect(component.getCompletenessLabel(0)).toBe('Empty');
    expect(component.getCompletenessLabel(50)).toBe('50%');
    expect(component.getCompletenessLabel(100)).toBe('Complete');
  });
});
