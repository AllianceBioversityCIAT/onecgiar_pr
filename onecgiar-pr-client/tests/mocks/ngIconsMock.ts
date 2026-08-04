import { Component, Input } from '@angular/core';

@Component({ selector: 'ng-icon', template: '', standalone: true })
export class NgIcon {
  @Input() name: string = '';
  @Input() size: string = '';
}

export function provideIcons(..._args: any[]): any[] {
  return [];
}
