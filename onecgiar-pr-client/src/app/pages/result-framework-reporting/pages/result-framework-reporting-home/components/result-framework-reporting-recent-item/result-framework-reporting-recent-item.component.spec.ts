import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultFrameworkReportingRecentItemComponent } from './result-framework-reporting-recent-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ResultFrameworkReportingRecentItemComponent', () => {
  let component: ResultFrameworkReportingRecentItemComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingRecentItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      providers: [],
      imports: [ResultFrameworkReportingRecentItemComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingRecentItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
