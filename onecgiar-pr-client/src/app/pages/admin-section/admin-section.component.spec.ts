import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSectionComponent } from './admin-section.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AdminSectionComponent', () => {
  let component: AdminSectionComponent;
  let fixture: ComponentFixture<AdminSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminSectionComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
