import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AdminSectionComponent } from './admin-section.component';
import { DataControlService } from '../../shared/services/data-control.service';

describe('AdminSectionComponent', () => {
  let component: AdminSectionComponent;
  let fixture: ComponentFixture<AdminSectionComponent>;
  let mockDataControlService: { detailSectionTitle: jest.Mock };

  beforeEach(async () => {
    mockDataControlService = {
      detailSectionTitle: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [AdminSectionComponent],
      imports: [HttpClientTestingModule],
      providers: [{ provide: DataControlService, useValue: mockDataControlService }]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set the detailSectionTitle on init', () => {
    expect(mockDataControlService.detailSectionTitle).toHaveBeenCalledWith('Admin Module');
  });
});
