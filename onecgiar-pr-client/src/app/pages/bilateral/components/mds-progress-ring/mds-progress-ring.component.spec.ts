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

  it('should compute ring color red for < 40%', () => {
    fixture.componentRef.setInput('percentage', 25);
    fixture.detectChanges();
    expect(component.ringColor()).toBe('#C62828');
  });

  it('should compute ring color amber for 40-80%', () => {
    fixture.componentRef.setInput('percentage', 60);
    fixture.detectChanges();
    expect(component.ringColor()).toBe('#F57F17');
  });

  it('should compute ring color green for > 80%', () => {
    fixture.componentRef.setInput('percentage', 90);
    fixture.detectChanges();
    expect(component.ringColor()).toBe('#2E7D32');
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
