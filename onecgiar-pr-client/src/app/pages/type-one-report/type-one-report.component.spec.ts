/* eslint-disable camelcase */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypeOneReportComponent } from './type-one-report.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrSelectComponent } from '../../custom-fields/pr-select/pr-select.component';
import { TorPanelMenuComponent } from './components/tor-panel-menu/tor-panel-menu.component';
import { LabelNamePipe } from '../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../custom-fields/pr-field-header/pr-field-header.component';
import { PrButtonComponent } from '../../custom-fields/pr-button/pr-button.component';
import { AlertStatusComponent } from '../../custom-fields/alert-status/alert-status.component';
import { ApiService } from '../../shared/services/api/api.service';
import { TypeOneReportService } from './type-one-report.service';
import { PhasesService } from '../../shared/services/global/phases.service';
import { of } from 'rxjs';
import { Router } from '@angular/router';

jest.useFakeTimers();

describe('TypeOneReportComponent', () => {
  let component: TypeOneReportComponent;
  let fixture: ComponentFixture<TypeOneReportComponent>;
  let mockApiService: any;
  let mockTypeOneReportService: any;
  let mockPhasesService: any;
  const mockGET_AllInitiativesResponse = [
    {
      official_code: 1
    }
  ];
  let mockRouter: any;

  beforeEach(async () => {
    mockApiService = {
      rolesSE: {
        validateReadOnly: jest.fn(),
        isAdmin: true
      },
      dataControlSE: {
        detailSectionTitle: jest.fn(),
        myInitiativesList: [
          {
            official_code: 1
          }
        ]
      },
      resultsSE: {
        GET_AllInitiatives: () => of({ response: mockGET_AllInitiativesResponse })
      }
    };

    mockTypeOneReportService = {
      phaseSelected: [],
      reportingPhases: [],
      allInitiatives: [
        {
          official_code: 1
        }
      ],
      initiativeSelected: '',
      sanitizeUrl: jest.fn(),
      showTorIframe: false
    };

    mockPhasesService = {
      phases: {
        reporting: []
      },
      getPhasesObservable: () => of([{ id: 1, status: 'open' }])
    };

    mockRouter = {
      url: '/url',
      navigateByUrl: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [TypeOneReportComponent, PrSelectComponent, TorPanelMenuComponent, LabelNamePipe, ListFilterByTextAndAttrPipe, PrFieldHeaderComponent, PrButtonComponent, AlertStatusComponent],
      imports: [HttpClientTestingModule, ScrollingModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: TypeOneReportService,
          useValue: mockTypeOneReportService
        },
        {
          provide: PhasesService,
          useValue: mockPhasesService
        },
        {
          provide: Router,
          useValue: mockRouter
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TypeOneReportComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call validateReadOnly and dataControlSE methods on ngOnInit', () => {
      const spyValidateReadOnly = jest.spyOn(mockApiService.rolesSE, 'validateReadOnly');
      const spyDetailSectionTitle = jest.spyOn(mockApiService.dataControlSE, 'detailSectionTitle');
      const spyGET_AllInitiatives = jest.spyOn(component, 'GET_AllInitiatives');
      const spyGetThePhases = jest.spyOn(component, 'getThePhases');

      component.ngOnInit();

      expect(spyValidateReadOnly).toHaveBeenCalled();
      expect(spyDetailSectionTitle).toHaveBeenCalled();
      expect(spyGET_AllInitiatives).toHaveBeenCalled();
      expect(spyGetThePhases).toHaveBeenCalled();
    });
  });

  describe('getThePhases()', () => {
    it('should call autoSelectOpenPhases whenphasesSE.phases.reporting.length is false', () => {
      component.ngOnInit();
      component.getThePhases();

      expect(component.typeOneReportSE.reportingPhases).toEqual([{ id: 1, status: 'open' }]);
    });

    it('should call autoSelectOpenPhases when phasesSE.phases.reporting.length is true', () => {
      mockPhasesService.phases.reporting = [{ id: 1, status: 'open' }];
      component.ngOnInit();
      component.getThePhases();

      expect(component.typeOneReportSE.reportingPhases).toEqual([{ id: 1, status: 'open' }]);
    });
  });

  describe('GET_AllInitiatives()', () => {
    it('should call selectFirstInitiative if isAdmin is false', () => {
      const spy = jest.spyOn(component, 'selectFirstInitiative');
      mockApiService.rolesSE.isAdmin = false;

      component.GET_AllInitiatives();

      expect(spy).toHaveBeenCalled();
    });
    it('should fetch initiatives and set selected initiative if isAdmin is true', () => {
      mockApiService.rolesSE.isAdmin = true;
      const spy = jest.spyOn(mockTypeOneReportService, 'sanitizeUrl');

      component.GET_AllInitiatives();

      expect(component.typeOneReportSE.allInitiatives).toEqual(mockGET_AllInitiativesResponse);
      expect(component.typeOneReportSE.initiativeSelected).toBe(1);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('selectFirstInitiative()', () => {
    it('should select the first initiative and call sanitizeUrl', () => {
      const spy = jest.spyOn(mockTypeOneReportService, 'sanitizeUrl');

      component.selectFirstInitiative();

      expect(component.typeOneReportSE.initiativeSelected).toBe(1);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getInitiativeShortName()', () => {
    it('should return the correct short name for admin user', () => {
      const result = component.getInitiativeShortName(1);

      expect(result).toBeUndefined();
    });

    it('should return the correct short name for non-admin user', () => {
      mockApiService.rolesSE.isAdmin = false;

      const result = component.getInitiativeShortName(1);

      expect(result).toBeUndefined();
    });
  });

  describe('selectFirstInitiative()', () => {
    it('should navigate, toggle iframe, and sanitizeUrl', () => {
      const routerNavigateByUrlSpy = jest.spyOn(mockRouter, 'navigateByUrl').mockResolvedValue(true);
      const spy = jest.spyOn(mockTypeOneReportService, 'sanitizeUrl');

      component.selectInitiativeEvent();
      jest.runAllTimers();

      expect(routerNavigateByUrlSpy).toHaveBeenCalledWith('/type-one-report/white');
      expect(component.typeOneReportSE.showTorIframe).toBeTruthy();
      expect(spy).toHaveBeenCalled();
    });
  });
});
