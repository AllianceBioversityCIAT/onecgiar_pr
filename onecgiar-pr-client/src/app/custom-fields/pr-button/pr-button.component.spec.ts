import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipModule } from 'primeng/tooltip';
import { PrButtonComponent } from './pr-button.component';

describe('PrButtonComponent', () => {
  let component: PrButtonComponent;
  let fixture: ComponentFixture<PrButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrButtonComponent],
      imports: [TooltipModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit click event when not disabled', () => {
    component.disabled = false;
    const emitSpy = jest.spyOn(component.clickEvent, 'emit');
    component.onClick();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should not emit click event when disabled', () => {
    component.disabled = true;
    const emitSpy = jest.spyOn(component.clickEvent, 'emit');
    component.onClick();
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
