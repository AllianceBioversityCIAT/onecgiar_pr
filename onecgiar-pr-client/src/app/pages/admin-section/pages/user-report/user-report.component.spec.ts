import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserReportComponent } from './user-report.component';
import { HttpClientModule } from '@angular/common/http';
import { FilterByTextModule } from '../../../../shared/pipes/filter-by-text.module';

describe('UserReportComponent', () => {
  let component: UserReportComponent;
  let fixture: ComponentFixture<UserReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserReportComponent],
      imports: [HttpClientModule, FilterByTextModule]
    }).compileComponents();

    fixture = TestBed.createComponent(UserReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
