import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrComponent } from './ipsr.component';
import { ApiService } from '../../shared/services/api/api.service';
import { IpsrDataControlService } from './services/ipsr-data-control.service';

describe('IpsrComponent', () => {
  let component: IpsrComponent;
  let fixture: ComponentFixture<IpsrComponent>;
  let mockApiService: any;
  let mockIpsrDataControlService: any;

  beforeEach(async () => {
    mockApiService = {
      rolesSE: { platformIsClosed: false },
      globalVariablesSE: { get: { ipsr_is_closed: true } }
    };
    mockIpsrDataControlService = { inIpsr: false };

    await TestBed.configureTestingModule({
      declarations: [IpsrComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: IpsrDataControlService, useValue: mockIpsrDataControlService }
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
});
