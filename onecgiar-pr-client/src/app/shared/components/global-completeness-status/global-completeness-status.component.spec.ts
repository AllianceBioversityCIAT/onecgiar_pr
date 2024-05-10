import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalCompletenessStatusComponent } from './global-completeness-status.component';
import { HttpClientModule } from '@angular/common/http';
import { FilterInitWithRoleCoordAndLeadModule } from '../../../pages/init-admin-section/pipes/filter-init-with-role-coord-and-lead/filter-init-with-role-coord-and-lead.module';
import { FilterByTextModule } from '../../pipes/filter-by-text.module';

describe('GlobalCompletenessStatusComponent', () => {
  let component: GlobalCompletenessStatusComponent;
  let fixture: ComponentFixture<GlobalCompletenessStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GlobalCompletenessStatusComponent],
      imports: [HttpClientModule, FilterInitWithRoleCoordAndLeadModule, FilterByTextModule]
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalCompletenessStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
