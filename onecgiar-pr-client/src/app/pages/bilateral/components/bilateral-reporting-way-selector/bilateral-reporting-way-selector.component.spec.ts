import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralReportingWaySelectorComponent } from './bilateral-reporting-way-selector.component';

describe('BilateralReportingWaySelectorComponent', () => {
  let component: BilateralReportingWaySelectorComponent;
  let fixture: ComponentFixture<BilateralReportingWaySelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralReportingWaySelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralReportingWaySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit manual way when enabled card is clicked', () => {
    const emitSpy = jest.spyOn(component.waySelected, 'emit');
    const manualOption = component.options.find(o => o.id === 'manual')!;
    component.selectWay(manualOption);
    expect(emitSpy).toHaveBeenCalledWith('manual');
  });

  it('should not emit AI when canUseAi is false', () => {
    fixture.componentRef.setInput('canUseAi', false);
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.waySelected, 'emit');
    const aiOption = component.options.find(o => o.id === 'ai')!;
    component.selectWay(aiOption);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit AI when canUseAi is true', () => {
    fixture.componentRef.setInput('canUseAi', true);
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.waySelected, 'emit');
    const aiOption = component.options.find(o => o.id === 'ai')!;
    component.selectWay(aiOption);
    expect(emitSpy).toHaveBeenCalledWith('ai');
  });

  it('should not emit when loading', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.waySelected, 'emit');
    const manualOption = component.options.find(o => o.id === 'manual')!;
    component.selectWay(manualOption);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should disable AI card when canUseAi is false', () => {
    fixture.componentRef.setInput('canUseAi', false);
    fixture.detectChanges();
    const aiOption = component.options.find(o => o.id === 'ai')!;
    expect(component.isOptionDisabled(aiOption)).toBe(true);
  });

  it('should enable AI card when canUseAi is true', () => {
    fixture.componentRef.setInput('canUseAi', true);
    fixture.detectChanges();
    const aiOption = component.options.find(o => o.id === 'ai')!;
    expect(component.isOptionDisabled(aiOption)).toBe(false);
  });
});
