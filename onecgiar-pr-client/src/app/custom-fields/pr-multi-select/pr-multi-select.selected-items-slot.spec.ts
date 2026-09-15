import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PrMultiSelectComponent } from './pr-multi-select.component';

/**
 * Candado del hueco `selectedItems` (14-sep-2026).
 *
 * Varios consumidores pintan sus propios chips —`rd-contributors-and-partners` tiene cinco— y hasta
 * hoy los declaraban como HERMANOS del `app-pr-multi-select`, o sea FUERA del marco `fc-boxed`: el
 * contenedor agrupaba título + descripción + desplegable y dejaba la selección huérfana debajo.
 *
 * Se prueban las DOS formas de entregarlos, porque la segunda es la que no es obvia:
 *  1. hijo directo con el atributo `selectedItems`;
 *  2. un `<ng-container ngProjectAs="[selectedItems]" *ngTemplateOutlet>` — necesario cuando DOS
 *     ramas de `@if` pintan el mismo dropdown y los chips no pueden duplicarse. 🛑 Sin `ngProjectAs`
 *     esto NO proyecta: el `select` del `ng-content` mira el nodo declarado en el sitio de uso (el
 *     `ng-container`), nunca lo que el `ng-template` pinta dentro — y los chips desaparecen sin un
 *     solo error.
 */
@Component({
  standalone: false,
  template: `
    <app-pr-multi-select [options]="options" optionValue="code" optionLabel="full_name" label="Centers" [(ngModel)]="selected">
      <div class="medal_selector selected_container" selectedItems>
        <div class="pr_chip_selected" data-testid="direct-chip">CIAT</div>
      </div>
    </app-pr-multi-select>

    <app-pr-multi-select [options]="options" optionValue="code" optionLabel="full_name" label="Other centers" [(ngModel)]="selected">
      <ng-container ngProjectAs="[selectedItems]" *ngTemplateOutlet="chips"></ng-container>
    </app-pr-multi-select>

    <ng-template #chips>
      <div class="medal_selector selected_container">
        <div class="pr_chip_selected" data-testid="outlet-chip">IWMI</div>
      </div>
    </ng-template>
  `
})
class HostComponent {
  options = [{ code: 'C1', full_name: 'Center 1' }];
  selected: any[] = [];
}

describe('pr-multi-select — hueco `selectedItems`', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrMultiSelectComponent, HostComponent],
      imports: [CommonModule, FormsModule, HttpClientTestingModule, ScrollingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  const selects = () => fixture.nativeElement.querySelectorAll('app-pr-multi-select');

  it('proyecta un hijo directo DENTRO del desplegable, no como hermano suelto', () => {
    const chip = fixture.nativeElement.querySelector('[data-testid="direct-chip"]');
    expect(chip).toBeTruthy();
    // Lo que se está probando es la POSICIÓN: dentro de la caja del campo, pegado al control.
    expect(selects()[0].contains(chip)).toBe(true);
    expect(chip.closest('.custom_select')).toBeTruthy();
  });

  it('proyecta también un ng-container con ngProjectAs + ngTemplateOutlet', () => {
    const chip = fixture.nativeElement.querySelector('[data-testid="outlet-chip"]');
    expect(chip).toBeTruthy();
    expect(selects()[1].contains(chip)).toBe(true);
    expect(chip.closest('.custom_select')).toBeTruthy();
  });
});
