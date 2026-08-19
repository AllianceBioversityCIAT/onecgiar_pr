import { Injectable, signal } from '@angular/core';
import { CreateComplementaryInnovationDto } from '../components/new-complementary-innovation/new-complementary-innovation.component';

@Injectable({
  providedIn: 'root'
})
export class ComplementaryInnovationService {
  dialogStatus = false;
  bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
  // P2-3322: signal-backed flag. `ComplementaryInnovationComponent.getComplementaryInnovation()` sets it to
  // `false` and back to `true` 100 ms later, inside a `setTimeout` nested in the GETComplementaryById
  // subscribe, so that the function checkboxes remount against the freshly loaded values. The flag is read
  // by a *different* component's template (new-complementary-innovation.component.html, `@if` at lines 81
  // and 100), so no signal owned by the writer component could reach it. Backing the state here makes every
  // template that reads the property a consumer of the signal, which is what schedules the render pass:
  // under zoneless change detection the delayed write notified nothing and the "Function" checkbox list
  // stayed blank when editing a complementary innovation. The public API is still a plain boolean, so the
  // templates, the writers and the existing service spec are untouched.
  private readonly _complementaries = signal<boolean>(true);
  get complementaries(): boolean {
    return this._complementaries();
  }
  set complementaries(value: boolean) {
    this._complementaries.set(value);
  }
  idInnovation: number;
  isEdit = false;

  resetAll() {
    this.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    this.complementaries = true;
    this.idInnovation = null;
    this.dialogStatus = false;
    this.isEdit = false;
  }
}
