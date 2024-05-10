import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSectionComponent } from './admin-section.component';
import { HttpClientModule } from '@angular/common/http';

describe('AdminSectionComponent', () => {
  let component: AdminSectionComponent;
  let fixture: ComponentFixture<AdminSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminSectionComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
