import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EntityAowService {
  entityId = signal<string>('');
  aowId = signal<string>('');

  constructor() {}
}
