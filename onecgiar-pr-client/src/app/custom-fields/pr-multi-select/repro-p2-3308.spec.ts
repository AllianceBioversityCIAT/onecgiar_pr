import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PrMultiSelectComponent } from './pr-multi-select.component';

// Reproduce EXACTAMENTE el patrón del consumidor real (aow-hlo-create-modal):
// signal + [ngModel] unidireccional + (ngModelChange) que hace .set()
@Component({
  standalone: false,
  template: `
    <app-pr-multi-select
      [options]="options"
      optionValue="code"
      optionLabel="full_name"
      label="Projects"
      selectedLabel="selected"
      [ngModel]="selected()"
      (ngModelChange)="selected.set($event)">
    </app-pr-multi-select>
  `
})
class HostComponent {
  options = [
    { code: 'P1', full_name: 'Project 1' },
    { code: 'P2', full_name: 'Project 2' },
    { code: 'P3', full_name: 'Project 3' }
  ];
  selected = signal<any[]>([]);
}

describe('REPRO P2-3308 — multi-select acumula selecciones', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let ms: PrMultiSelectComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrMultiSelectComponent, HostComponent],
      imports: [FormsModule, HttpClientTestingModule, ScrollingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    ms = fixture.debugElement.children[0].componentInstance;
  });

  const clickOption = (code: string) => {
    const option = ms.optionsIntance().find((o: any) => o.code === code);
    ms.onSelectOption(option);
    fixture.detectChanges();
  };

  const codes = () => host.selected().map((s: any) => s.code);
  const checked = () =>
    ms
      .optionsIntance()
      .filter((o: any) => o.selected)
      .map((o: any) => o.code);

  it('clic P1 → P2 → P3 deja los tres marcados', () => {
    clickOption('P1');
    clickOption('P2');
    clickOption('P3');

    expect(codes().sort()).toEqual(['P1', 'P2', 'P3']);
    expect(checked().sort()).toEqual(['P1', 'P2', 'P3']);
  });
});
