import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TooltipModule } from 'primeng/tooltip';
import { InitAdminSectionComponent } from './init-admin-section.component';
import { DynamicPanelMenuComponent } from '../../shared/components/dynamic-panel-menu/dynamic-panel-menu.component';
import { RouterTestingModule } from '@angular/router/testing';
import { DataControlService } from '../../shared/services/data-control.service';

describe('InitAdminSectionComponent', () => {
  let component: InitAdminSectionComponent;
  let fixture: ComponentFixture<InitAdminSectionComponent>;
  let mockDataControlService;

  beforeEach(async () => {
    mockDataControlService = {
      detailSectionTitle: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        InitAdminSectionComponent, 
        DynamicPanelMenuComponent
      ],
      imports: [
        HttpClientTestingModule, 
        TooltipModule,
        RouterTestingModule
      ],
      providers: [
        {
          provide: DataControlService,
          useValue: mockDataControlService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InitAdminSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit()', () => {
    it('should set the detailSectionTitle on ngOnInit', () => {
      const spyDetailSectionTitle = jest.spyOn(mockDataControlService, 'detailSectionTitle');
  
      component.ngOnInit();
  
      expect(spyDetailSectionTitle).toHaveBeenCalledWith('INIT Admin Module');
    });
  });
});
