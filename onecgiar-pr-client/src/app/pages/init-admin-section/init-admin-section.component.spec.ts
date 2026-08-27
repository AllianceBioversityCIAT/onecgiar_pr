import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { InitAdminSectionComponent } from './init-admin-section.component';
import { RouterTestingModule } from '@angular/router/testing';
import { DataControlService } from '../../shared/services/data-control.service';
import { ApiService } from '../../shared/services/api/api.service';

describe('InitAdminSectionComponent', () => {
  let component: InitAdminSectionComponent;
  let fixture: ComponentFixture<InitAdminSectionComponent>;
  let mockDataControlService: { detailSectionTitle: jest.Mock };

  beforeEach(async () => {
    mockDataControlService = {
      detailSectionTitle: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [InitAdminSectionComponent],
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: DataControlService, useValue: mockDataControlService },
        { provide: ApiService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InitAdminSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit()', () => {
    it('should set the detailSectionTitle on ngOnInit', () => {
      const spyDetailSectionTitle = jest.spyOn(mockDataControlService, 'detailSectionTitle');

      component.ngOnInit();

      expect(spyDetailSectionTitle).toHaveBeenCalledWith('My Admin');
    });
  });
});
