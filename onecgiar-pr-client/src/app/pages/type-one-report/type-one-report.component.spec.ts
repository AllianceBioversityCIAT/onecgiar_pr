/* eslint-disable arrow-parens */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TypeOneReportComponent } from './type-one-report.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { TorPanelMenuComponent } from './components/tor-panel-menu/tor-panel-menu.component';
import { AlertStatusComponent } from '../../custom-fields/alert-status/alert-status.component';
import { PrSelectComponent } from '../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../custom-fields/pr-select/label-name.pipe';
import { ListFilterByTextAndAttrPipe } from '../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../custom-fields/pr-field-header/pr-field-header.component';
import { PrButtonComponent } from '../../custom-fields/pr-button/pr-button.component';
import { TooltipModule } from 'primeng/tooltip';

describe('TypeOneReportComponent', () => {
  let component: TypeOneReportComponent;
  let fixture: ComponentFixture<TypeOneReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TypeOneReportComponent, TorPanelMenuComponent, AlertStatusComponent, PrSelectComponent, LabelNamePipe, ListFilterByTextAndAttrPipe, PrFieldHeaderComponent, PrButtonComponent],
      imports: [RouterTestingModule, HttpClientTestingModule, ScrollingModule, FormsModule, TooltipModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TypeOneReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should auto select open phases when phases are already loaded', () => {
    const openPhase: any = { id: 1, status: true };
    component.phasesSE.phases.reporting = [openPhase, { id: 2, status: false }];

    component.getThePhases();

    expect(component.typeOneReportSE.phaseSelected).toEqual(openPhase.id);
    expect(component.typeOneReportSE.reportingPhases).toEqual(component.phasesSE.phases.reporting);
  });

  it('should listen for phases when phases are not loaded', () => {
    const openPhase = { id: 1, status: true };
    const loadedPhases = [openPhase, { id: 2, status: false }];
    component.phasesSE.phases.reporting = [];

    const getPhasesObservableSpy = jest.spyOn(component.phasesSE, 'getPhasesObservable').mockReturnValue(of(loadedPhases));

    component.getThePhases();

    expect(getPhasesObservableSpy).toHaveBeenCalled();
    expect(component.typeOneReportSE.reportingPhases).toEqual(loadedPhases);
    expect(component.typeOneReportSE.phaseSelected).toEqual(openPhase.id);
  });

  it('should get all initiatives and select the first one', () => {
    const mockResponse = [{ official_code: 'initiative1' }, { official_code: 'initiative2' }];
    const selectFirstInitiativeSpy = jest.spyOn(component, 'selectFirstInitiative');
    const getAllInitiativesSpy = jest.spyOn(component.api.resultsSE, 'GET_AllInitiatives').mockReturnValue(of({ response: mockResponse }));
    const sanitizeUrlSpy = jest.spyOn(component.typeOneReportSE, 'sanitizeUrl');
    component.api.rolesSE.isAdmin = true;

    component.GET_AllInitiatives();

    expect(getAllInitiativesSpy).toHaveBeenCalled();
    expect(component.typeOneReportSE.allInitiatives).toEqual(mockResponse);
    expect(component.typeOneReportSE.initiativeSelected).toEqual(mockResponse[0]?.official_code);
    expect(sanitizeUrlSpy).toHaveBeenCalled();
    expect(selectFirstInitiativeSpy).not.toHaveBeenCalled();
  });

  it('should select the first initiative if user is not an admin', () => {
    component.api.rolesSE.isAdmin = false;
    const selectFirstInitiativeSpy = jest.spyOn(component, 'selectFirstInitiative');
    const getAllInitiativesSpy = jest.spyOn(component.api.resultsSE, 'GET_AllInitiatives');

    component.GET_AllInitiatives();

    expect(getAllInitiativesSpy).not.toHaveBeenCalled();
    expect(selectFirstInitiativeSpy).toHaveBeenCalled();
  });

  it('should select the first initiative', () => {
    jest.spyOn(component.typeOneReportSE, 'sanitizeUrl');
    component.selectFirstInitiative();
    expect(component.typeOneReportSE.initiativeSelected).toEqual(component.api.dataControlSE.myInitiativesList[0]?.official_code);
    expect(component.typeOneReportSE.sanitizeUrl).toHaveBeenCalled();
  });

  it('should navigate to the initiative event and then back to the current URL', async () => {
    const currentUrl = '/type-one-report/ipi-cgiar-portfolio-linkages';
    const navigateByUrlSpy = jest.spyOn(component.router, 'navigateByUrl').mockReturnValue(Promise.resolve(true));
    const sanitizeUrlSpy = jest.spyOn(component.typeOneReportSE, 'sanitizeUrl');

    component.selectInitiativeEvent();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/type-one-report/ipi-cgiar-portfolio-linkages');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(navigateByUrlSpy).toHaveBeenCalledWith(currentUrl);
    expect(component.typeOneReportSE.showTorIframe).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(component.typeOneReportSE.showTorIframe).toBe(true);
    expect(sanitizeUrlSpy).toHaveBeenCalled();
  });
});
