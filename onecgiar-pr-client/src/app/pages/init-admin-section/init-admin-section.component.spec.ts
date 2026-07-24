import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { InitAdminSectionComponent } from './init-admin-section.component';
import { RouterTestingModule } from '@angular/router/testing';
import { DataControlService } from '../../shared/services/data-control.service';
import { ApiService } from '../../shared/services/api/api.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('InitAdminSectionComponent', () => {
  let component: InitAdminSectionComponent;
  let fixture: ComponentFixture<InitAdminSectionComponent>;
  let mockDataControlService: any;

  beforeEach(async () => {
    mockDataControlService = {
      detailSectionTitle: jest.fn(),
      hideMainNav: signal(false),
      hideHeaderChrome: signal(false)
    };

    await TestBed.configureTestingModule({
      declarations: [InitAdminSectionComponent],
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        {
          provide: DataControlService,
          useValue: mockDataControlService
        },
        {
          provide: ApiService,
          useValue: {}
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(InitAdminSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize sections with correct data', () => {
    expect(component.sections).toBeDefined();
    expect(component.sections.length).toBe(1);
    expect(component.sections[0]).toEqual({
      name: 'General results report',
      icon: 'task',
      path: '/init-admin-module/init-general-results-report'
    });
  });

  describe('ngOnInit()', () => {
    it('should set the detailSectionTitle on ngOnInit', () => {
      const spyDetailSectionTitle = jest.spyOn(mockDataControlService, 'detailSectionTitle');

      component.ngOnInit();

      expect(spyDetailSectionTitle).toHaveBeenCalledWith('My Admin');
    });

    it('should hide the top header chrome while the sidebar is active', () => {
      expect(mockDataControlService.hideMainNav()).toBe(true);
      expect(mockDataControlService.hideHeaderChrome()).toBe(true);
    });
  });
});
