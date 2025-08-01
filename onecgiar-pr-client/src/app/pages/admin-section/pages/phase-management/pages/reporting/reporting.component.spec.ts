import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportingComponent } from './reporting.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';

describe('ReportingComponent', () => {
  let component: ReportingComponent;
  let fixture: ComponentFixture<ReportingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportingComponent],
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have moduleType as ModuleTypeEnum.REPORTING', () => {
    expect(component.moduleType).toBe(ModuleTypeEnum.REPORTING);
  });

  it('should have appModuleId as 1', () => {
    expect(component.appModuleId).toBe(1);
  });

  it('should call onPhaseUpdate without error', () => {
    expect(() => component.onPhaseUpdate()).not.toThrow();
  });
});
