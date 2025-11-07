import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultFrameworkReportingCardItemComponent } from './result-framework-reporting-card-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('ResultFrameworkReportingCardItemComponent', () => {
  let component: ResultFrameworkReportingCardItemComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingCardItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      providers: [],
      imports: [ResultFrameworkReportingCardItemComponent, HttpClientTestingModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingCardItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
