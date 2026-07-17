import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MdsProgressRingComponent } from './mds-progress-ring.component';

describe('MdsProgressRingComponent', () => {
  let component: MdsProgressRingComponent;
  let fixture: ComponentFixture<MdsProgressRingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MdsProgressRingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MdsProgressRingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default percentage to 0 and size to 80', () => {
    expect(component.percentage()).toBe(0);
    expect(component.size()).toBe(80);
  });

  it('should compute ring color violet for < 100%', () => {
    fixture.componentRef.setInput('percentage', 25);
    fixture.detectChanges();
    expect(component.ringColor()).toBe('#6b6dc4');
  });

  it('should compute ring color violet for in-progress values', () => {
    fixture.componentRef.setInput('percentage', 60);
    fixture.detectChanges();
    expect(component.ringColor()).toBe('#6b6dc4');
  });

  it('should compute ring color green when complete', () => {
    fixture.componentRef.setInput('percentage', 100);
    fixture.detectChanges();
    expect(component.ringColor()).toBe('#19ae58');
  });

  it('should compute circumference correctly', () => {
    fixture.componentRef.setInput('size', 80);
    fixture.detectChanges();
    expect(component.circumference()).toBeGreaterThan(0);
  });

  it('should compute dashOffset from percentage', () => {
    fixture.componentRef.setInput('percentage', 50);
    fixture.detectChanges();
    expect(component.dashOffset()).toBe(component.circumference() * 0.5);
  });
});
