import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IpsrComponent } from './ipsr.component';
import { ApiService } from '../../shared/services/api/api.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { IpsrDataControlService } from './services/ipsr-data-control.service';

describe('IpsrComponent', () => {
  let component: IpsrComponent;
  let fixture: ComponentFixture<IpsrComponent>;
  let mockApiService: any;
  let mockIpsrDataControlService: any;
  let mockDataControlService: any;

  beforeEach(async () => {
    mockApiService = {
      rolesSE: { platformIsClosed: false },
      globalVariablesSE: { get: { ipsr_is_closed: true } },
      dataControlSE: { myInitiativesLoaded: true }
    };
    mockIpsrDataControlService = { inIpsr: false };
    mockDataControlService = {
      hideMainNav: signal(false),
      hideHeaderChrome: signal(false)
    };

    await TestBed.configureTestingModule({
      declarations: [IpsrComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: IpsrDataControlService, useValue: mockIpsrDataControlService },
        { provide: DataControlService, useValue: mockDataControlService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set inIpsr to true and platformIsClosed from globalVariablesSE', () => {
    expect(mockIpsrDataControlService.inIpsr).toBe(true);
    expect(mockApiService.rolesSE.platformIsClosed).toBe(true);
  });

  it('should hide the top header chrome while the sidebar is active', () => {
    expect(mockDataControlService.hideMainNav()).toBe(true);
    expect(mockDataControlService.hideHeaderChrome()).toBe(true);
  });
});
