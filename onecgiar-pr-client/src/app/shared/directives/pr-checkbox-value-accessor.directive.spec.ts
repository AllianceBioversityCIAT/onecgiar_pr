import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { PrCheckboxValueAccessorDirective } from './pr-checkbox-value-accessor.directive';

@Component({
  standalone: false,
  template: `
    <input type="checkbox" prCheckboxValue [value]="'a'" [(ngModel)]="model" />
    <input type="checkbox" prCheckboxValue [value]="'b'" [(ngModel)]="model" />
  `
})
class HostComponent {
  model: any[] = [];
}

describe('PrCheckboxValueAccessorDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [HostComponent, PrCheckboxValueAccessorDirective]
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const inputs = () => fixture.nativeElement.querySelectorAll('input[type=checkbox]') as NodeListOf<HTMLInputElement>;

  const toggle = async (idx: number, checked: boolean) => {
    const el = inputs()[idx];
    el.checked = checked;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('adds a value to the model array when checked (membership, not boolean)', async () => {
    await toggle(0, true);
    expect(host.model).toEqual(['a']);
    await toggle(1, true);
    expect(host.model).toEqual(['a', 'b']);
  });

  it('removes a value from the model array when unchecked', async () => {
    host.model = ['a', 'b'];
    fixture.detectChanges();
    await fixture.whenStable();
    await toggle(0, false);
    expect(host.model).toEqual(['b']);
  });

  it('reflects model membership onto the checkbox checked state (writeValue)', async () => {
    host.model = ['b'];
    fixture.detectChanges();
    await fixture.whenStable();
    expect(inputs()[0].checked).toBe(false);
    expect(inputs()[1].checked).toBe(true);
  });
});
