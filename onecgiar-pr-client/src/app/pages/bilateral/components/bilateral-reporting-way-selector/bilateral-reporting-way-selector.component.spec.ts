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

  it('should not emit disabled ways', () => {
    const emitSpy = jest.spyOn(component.waySelected, 'emit');
    const aiOption = component.options.find(o => o.id === 'ai')!;
    component.selectWay(aiOption);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should not emit when loading', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.waySelected, 'emit');
    const manualOption = component.options.find(o => o.id === 'manual')!;
    component.selectWay(manualOption);
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
