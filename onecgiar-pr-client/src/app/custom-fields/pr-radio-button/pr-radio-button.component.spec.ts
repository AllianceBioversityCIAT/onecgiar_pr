import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PrRadioButtonComponent } from './pr-radio-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RadioButtonComponent', () => {
  let component: PrRadioButtonComponent;
  let fixture: ComponentFixture<PrRadioButtonComponent>;

  /** Renders one instance with two options, the way every real consumer uses it. */
  const renderGroup = (labels: string[]): ComponentFixture<PrRadioButtonComponent> => {
    const f = TestBed.createComponent(PrRadioButtonComponent);
    f.componentInstance.options = labels.map((name, i) => ({ name, id: i + 1 }));
    f.componentInstance.optionLabel = 'name';
    f.componentInstance.optionValue = 'id';
    f.detectChanges();
    return f;
  };

  const idsOf = (f: ComponentFixture<PrRadioButtonComponent>): string[] =>
    Array.from(f.nativeElement.querySelectorAll('input.pr-native-radio')).map((i: any) => i.id);

  const forsOf = (f: ComponentFixture<PrRadioButtonComponent>): string[] =>
    Array.from(f.nativeElement.querySelectorAll('label.name')).map((l: any) => l.getAttribute('for'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrRadioButtonComponent],
      imports: [HttpClientTestingModule, FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PrRadioButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // P2-3350: ids used to be `radio_{{i}}`, indexed only within each instance's own *ngFor, so two
  // groups on the same page emitted the same ids. `<label for>` resolves via getElementById(), which
  // returns the FIRST match — clicking a later group's option text checked an earlier group's radio.
  it('gives every option an id unique across instances, and points each label at its own input', () => {
    const lengthOfTraining = renderGroup(['Short-term', 'Long-term']);
    const deliveryMethod = renderGroup(['Virtual / Online', 'In person', 'Blended']);

    const firstIds = idsOf(lengthOfTraining);
    const secondIds = idsOf(deliveryMethod);

    expect(firstIds).toHaveLength(2);
    expect(secondIds).toHaveLength(3);
    expect(firstIds.every(id => !!id)).toBe(true);
    expect(secondIds.every(id => !!id)).toBe(true);

    // No id is shared between the two groups.
    expect(new Set([...firstIds, ...secondIds]).size).toBe(firstIds.length + secondIds.length);

    // Each label targets the input rendered beside it, in order.
    expect(forsOf(lengthOfTraining)).toEqual(firstIds);
    expect(forsOf(deliveryMethod)).toEqual(secondIds);
  });

  it('keeps the native radio group name aligned with the option ids', () => {
    const group = renderGroup(['Yes', 'No']);
    const names: string[] = Array.from(group.nativeElement.querySelectorAll('input.pr-native-radio')).map(
      (i: any) => i.getAttribute('name')
    );

    expect(new Set(names).size).toBe(1);
    idsOf(group).forEach(id => expect(id.startsWith(names[0])).toBe(true));
  });
});
